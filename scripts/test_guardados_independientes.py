"""Prueba de regresión para guardados independientes.

Este script automatiza un recorrido sencillo en el entorno apuntado por
``BASE_URL`` para verificar que cuando se realizan guardados independientes de
acuerdos o controles, se crea automáticamente un registro en ``public.usuarios``
si el RUN no existe todavía.

Uso:
    BASE_URL=https://staging.example.cl \
    USERNAME=mi_usuario PASSWORD=mi_password \
    python scripts/test_guardados_independientes.py

El script genera dos RUN temporales válidos, ejecuta las operaciones y luego
consulta el endpoint ``/api/usuarios/<run>/categoria`` para verificar que el
usuario quedó registrado.
"""

from __future__ import annotations

import os
import random
import sys
import time
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any, Callable, ContextManager, cast
from typing import Mapping as TypingMapping
from urllib.parse import urljoin

import requests

# Agregar la raíz del proyecto al path para reutilizar helpers existentes
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from database_helpers import dict_cursor as _dict_cursor  # noqa: E402
from database_helpers import get_conn as _get_conn  # noqa: E402
from validators import calculate_dv, format_run_with_dots  # noqa: E402

get_conn = cast(Callable[[], ContextManager[Any]], _get_conn)
dict_cursor = cast(Callable[[Any], ContextManager[Any]], _dict_cursor)

DictRow = TypingMapping[str, Any]


def _env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if not value:
        raise RuntimeError(f"Variable de entorno requerida: {name}")
    return value


def generar_run_valido(seed: int) -> str:
    cuerpo = f"{seed:08d}"
    dv = calculate_dv(cuerpo)
    run_sin_formato = cuerpo + dv
    formato = format_run_with_dots(run_sin_formato)
    if not formato:
        raise RuntimeError(f"No se pudo formatear RUN generado: {run_sin_formato}")
    return formato


def login(session: requests.Session, base_url: str, username: str, password: str) -> None:
    login_url = urljoin(base_url, "/login")
    resp = session.get(login_url, timeout=15)
    resp.raise_for_status()

    resp = session.post(
        login_url,
        data={"username": username, "password": password},
        allow_redirects=False,
        timeout=15,
    )
    if resp.status_code not in (302, 200):
        raise RuntimeError(f"Login falló con status {resp.status_code}")


def _formatear_fecha_actual() -> str:
    return time.strftime("%Y-%m-%d")


def _post_form(
    session: requests.Session,
    base_url: str,
    data: Sequence[tuple[str, str]] | dict[str, str],
) -> requests.Response:
    url = urljoin(base_url, "/usuario/nuevo")
    payload: Any
    if isinstance(data, Mapping):
        payload = data
    else:
        payload = list(data)
    resp = session.post(url, data=payload, timeout=20, allow_redirects=False)
    if resp.status_code not in (200, 302):
        raise RuntimeError(f"POST a /usuario/nuevo respondió {resp.status_code}: {resp.text[:200]}")
    return resp


def _usuario_existe(session: requests.Session, base_url: str, run: str) -> bool:
    url = urljoin(base_url, f"/api/usuarios/{run}/categoria")
    resp = session.get(url, timeout=15)
    if resp.status_code == 200:
        return True
    if resp.status_code == 404:
        return False
    raise RuntimeError(
        f"Consulta de categoría devolvió status {resp.status_code}: {resp.text[:200]}"
    )


def probar_guardado_acuerdos(session: requests.Session, base_url: str, run: str) -> None:
    datos = {
        "run": run,
        "guardar_solo_acuerdos": "1",
        "nuevo_acuerdo": "Llamada de seguimiento automatizada",
        "cumplimiento": "cumple",
        "observaciones": "Prueba automatizada guardado acuerdos",
        "fecha_acuerdo": _formatear_fecha_actual(),
    }
    _post_form(session, base_url, datos)
    if not _usuario_existe(session, base_url, run):
        raise AssertionError("El usuario no quedó creado tras guardar acuerdos")


def probar_guardado_control(session: requests.Session, base_url: str, run: str) -> None:
    datos = {
        "run": run,
        "guardar_solo_control": "1",
        "fecha": _formatear_fecha_actual(),
        "profesional": "Tester Automatizado",
        "peso": "72",
        "talla": "1.70",
        "presion_sistolica": "120",
        "presion_diastolica": "80",
        "observaciones": "Control generado por script de prueba",
    }
    _post_form(session, base_url, datos)
    if not _usuario_existe(session, base_url, run):
        raise AssertionError("El usuario no quedó creado tras guardar control")


def _split_table_name(table_full_name: str) -> tuple[str, str]:
    if "." in table_full_name:
        schema, table = table_full_name.split(".", 1)
    else:
        schema, table = "public", table_full_name
    return schema, table


def _tabla_tiene_columna(cur: Any, table_full_name: str, column: str) -> bool:
    schema, table = _split_table_name(table_full_name)
    cur.execute(
        """
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = %s AND table_name = %s AND column_name = %s
         LIMIT 1
        """,
        (schema, table, column),
    )
    return cur.fetchone() is not None


def _detectar_columna_run(cur: Any, table_full_name: str) -> str:
    for candidate in ("usuario_id", "usuario_run", "run"):
        if _tabla_tiene_columna(cur, table_full_name, candidate):
            return candidate
    raise RuntimeError(f"No se encontró columna RUN en {table_full_name}")


def _obtener_sector_id() -> str:
    with get_conn() as conn, dict_cursor(conn) as cur:
        cur.execute("SELECT id FROM public.sectores ORDER BY id ASC LIMIT 1")
        row = cur.fetchone()
        if not isinstance(row, dict):
            raise RuntimeError("Cursor de sectores debe entregar diccionarios")
        row_dict = cast(DictRow, row)
        value = row_dict.get("id")
        if value in (None, ""):
            raise RuntimeError("No se encontró un sector activo en la base de datos")
        return str(value)


def _query_first(cur: Any, query: str, params: Iterable[Any]) -> DictRow | None:
    cur.execute(query, tuple(params))
    result = cur.fetchone()
    if result is None:
        return None
    if not isinstance(result, dict):
        raise RuntimeError("Se esperaba un cursor en modo diccionario")
    return cast(DictRow, result)


def _verificar_guardado_completo(
    run: str,
    nombre: str,
    telefono: str,
    nivel_educacional: str,
    profesional: str,
    acuerdo: str,
    cumplimiento: str,
    patologias: set[str],
) -> None:
    with get_conn() as conn, dict_cursor(conn) as cur:
        usuario = _query_first(
            cur,
            """
            SELECT nombre, telefono, ingreso_ecicep, en_programa_cv
              FROM public.usuarios
             WHERE run = %s
            """,
            (run,),
        )
        if not usuario:
            raise AssertionError("Usuario no se guardó en public.usuarios")
        if usuario.get("nombre") != nombre:
            raise AssertionError(f"Nombre inesperado en usuarios: {usuario.get('nombre')}")
        if telefono and usuario.get("telefono") != telefono:
            raise AssertionError("Teléfono no coincide con el enviado en el formulario")

        demograficos_col = _detectar_columna_run(cur, "public.demograficos")
        demografico = _query_first(
            cur,
            f"""
            SELECT nivel_educacional, origen_etnico, estado_civil
              FROM public.demograficos
             WHERE {demograficos_col} = %s
            """,
            (run,),
        )
        if not demografico:
            raise AssertionError("No se encontraron datos demográficos para el usuario")
        if nivel_educacional and demografico.get("nivel_educacional") != nivel_educacional:
            raise AssertionError("Nivel educacional no coincide")

        control_col = (
            "run" if _tabla_tiene_columna(cur, "public.usuariocontrol", "run") else "usuario_id"
        )
        control = _query_first(
            cur,
            f"""
            SELECT profesional, peso, talla
              FROM public.usuariocontrol
             WHERE {control_col} = %s
             ORDER BY fecha DESC NULLS LAST
             LIMIT 1
            """,
            (run,),
        )
        if not control:
            raise AssertionError("No se encontró el control médico registrado")
        if profesional and control.get("profesional") != profesional:
            raise AssertionError("Profesional del control no coincide con el enviado")

        acuerdos_col = _detectar_columna_run(cur, "public.acuerdos")
        acuerdo_row = _query_first(
            cur,
            f"""
            SELECT acuerdos, cumplimiento
              FROM public.acuerdos
             WHERE {acuerdos_col} = %s
             ORDER BY fecha_creacion DESC NULLS LAST
             LIMIT 1
            """,
            (run,),
        )
        if not acuerdo_row:
            raise AssertionError("No se encontró el acuerdo guardado en la base de datos")
        if acuerdo and acuerdo_row.get("acuerdos") != acuerdo:
            raise AssertionError("Texto de acuerdo diferente al esperado")
        if cumplimiento and acuerdo_row.get("cumplimiento") != cumplimiento:
            raise AssertionError("Cumplimiento del acuerdo no coincide")

        cur.execute(
            """
            SELECT DISTINCT UPPER(p.cie10) AS cie10
              FROM public.usuarios_patologias up
              JOIN public.patologias p ON p.id = up.patologia_id
             WHERE regexp_replace(up.usuario_id::text,'[^0-9kK]','','g') = regexp_replace(%s,'[^0-9kK]','','g')
            """,
            (run,),
        )
        registros = cur.fetchall()
        cie10_registrados: set[str] = set()
        for row in registros:
            if not isinstance(row, dict):
                continue
            row_dict = cast(DictRow, row)
            cie10 = row_dict.get("cie10")
            if isinstance(cie10, str) and cie10:
                cie10_registrados.add(cie10.upper())
        if not patologias.issubset(cie10_registrados):
            raise AssertionError(
                f"Patologías esperadas {patologias} no están completas en la base ({cie10_registrados})"
            )


def _build_full_form_payload(
    run: str,
    nombre: str,
    telefono: str,
    sector_id: str,
    acuerdo: str,
    cumplimiento: str,
    profesional: str,
    patologias: Sequence[str],
) -> list[tuple[str, str]]:
    fecha_hoy = _formatear_fecha_actual()
    payload: list[tuple[str, str]] = [
        ("run", run),
        ("nombre", nombre),
        ("fecha_nacimiento", "1985-03-15"),
        ("direccion", "Calle Falsa 123"),
        ("telefono", telefono),
        ("sexo", "femenino"),
        ("sector_id", sector_id),
        ("fecha_ingreso", fecha_hoy),
        ("ingreso_ecicep", "1"),
        ("en_programa_cv", "0"),
        ("nivel_educacional", "Universitaria completa"),
        ("origen_etnico", "Pueblo Mapuche"),
        ("estado_civil", "Casado(a)"),
        ("guardar_solo_patologias", "0"),
        ("guardar_solo_acuerdos", "0"),
        ("guardar_solo_control", "0"),
        ("fecha", fecha_hoy),
        ("profesional", profesional),
        ("peso", "70"),
        ("talla", "1.70"),
        ("presion_sistolica", "120"),
        ("presion_diastolica", "80"),
        ("cc", "90"),
        ("hgt", "95"),
        ("hba1c", "6.2"),
        ("nuevo_acuerdo", acuerdo),
        ("cumplimiento", cumplimiento),
        ("observaciones", "Caso generado por prueba automatizada"),
        ("fecha_acuerdo", fecha_hoy),
    ]
    for pat in patologias:
        payload.append(("patologias", pat))
    return payload


def probar_formulario_completo(
    session: requests.Session,
    base_url: str,
    run: str,
    sector_id: str,
) -> None:
    nombre = f"Usuario QA {run[-4:]}"
    telefono = "998877665"
    profesional = "Tester Automatizado"
    acuerdo = "Control anual programado"
    cumplimiento = "cumple"
    patologias = ["E11", "I10"]

    payload = _build_full_form_payload(
        run,
        nombre,
        telefono,
        sector_id,
        acuerdo,
        cumplimiento,
        profesional,
        patologias,
    )
    _post_form(session, base_url, payload)
    if not _usuario_existe(session, base_url, run):
        raise AssertionError("El usuario no quedó creado tras el guardado completo")

    _verificar_guardado_completo(
        run,
        nombre,
        telefono,
        "Universitaria completa",
        profesional,
        acuerdo,
        cumplimiento,
        set(patologias),
    )


def main() -> None:
    base_url = _env("BASE_URL")
    username = _env("USERNAME")
    password = _env("PASSWORD")

    random_seed = int(time.time())
    run_acuerdo = generar_run_valido(random_seed % 10_000_000 + random.randint(0, 999))
    run_control = generar_run_valido((random_seed + 5000) % 10_000_000 + random.randint(0, 999))
    run_completo = generar_run_valido((random_seed + 9000) % 10_000_000 + random.randint(0, 999))

    sector_id = _obtener_sector_id()

    with requests.Session() as session:
        login(session, base_url, username, password)
        probar_guardado_acuerdos(session, base_url, run_acuerdo)
        probar_guardado_control(session, base_url, run_control)
        probar_formulario_completo(session, base_url, run_completo, sector_id)

    print("✔ Guardados independientes verificados con éxito")
    print(f"  RUN acuerdos: {run_acuerdo}")
    print(f"  RUN control:  {run_control}")
    print("✔ Formulario completo verificado contra la base de datos")
    print(f"  RUN completo: {run_completo}")


if __name__ == "__main__":
    main()

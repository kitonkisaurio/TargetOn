#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Análisis simple de BD para REM P 2025"""

import psycopg2
from psycopg2.extras import DictCursor

DB_CONFIG = {
    "host": "100.112.100.86",
    "port": 5432,
    "user": "postgres",
    "password": "nasa3866",
    "database": "ecicep2025",
}


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor(cursor_factory=DictCursor)

    print("=" * 80)
    print("🔍 ANÁLISIS REM P 2025 - BASE DE DATOS ECICEP2025")
    print("=" * 80)
    print()

    # 1. Total usuarios activos
    cur.execute("SELECT COUNT(*) FROM usuarios")
    print(f"✅ Total usuarios: {cur.fetchone()[0]:,}")

    # 2. Verificar tabla usuarios_patologias
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'usuarios_patologias'
        )
    """)

    if cur.fetchone()[0]:
        cur.execute("SELECT COUNT(*) FROM usuarios_patologias")
        print(f"✅ Registros usuarios_patologias: {cur.fetchone()[0]:,}")

        # Mostrar estructura
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns
            WHERE table_name = 'usuarios_patologias'
            ORDER BY ordinal_position
        """)
        print("\n📋 Columnas de usuarios_patologias:")
        for col in cur.fetchall():
            print(f"   • {col['column_name']}: {col['data_type']}")

    # 3. Patologías en catálogo
    cur.execute("SELECT COUNT(*) FROM patologias")
    print(f"\n✅ Total patologías en catálogo: {cur.fetchone()[0]:,}")

    # 4. Exámenes
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'examenes_screening_normalizado'
        )
    """)

    if cur.fetchone()[0]:
        cur.execute("SELECT COUNT(*) FROM examenes_screening_normalizado")
        print(f"✅ Exámenes screening: {cur.fetchone()[0]:,}")

    # 5. Listar tablas con "exam"
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables
        WHERE table_schema = 'public' 
        AND table_name LIKE '%exam%'
        ORDER BY table_name
    """)
    print("\n📊 Tablas de exámenes disponibles:")
    for row in cur.fetchall():
        print(f"   • {row['table_name']}")

    # 6. Listar tablas con "patolog"
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables
        WHERE table_schema = 'public' 
        AND table_name LIKE '%patolog%'
        ORDER BY table_name
    """)
    print("\n🏥 Tablas de patologías disponibles:")
    for row in cur.fetchall():
        print(f"   • {row['table_name']}")

    # 7. Historial cardiovascular
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables
        WHERE table_schema = 'public' 
        AND table_name LIKE '%historial'
        ORDER BY table_name
    """)
    print("\n❤️  Tablas historial disponibles:")
    for row in cur.fetchall():
        print(f"   • {row['table_name']}")

    conn.close()
    print("\n" + "=" * 80)
    print("✅ ANÁLISIS COMPLETADO")
    print("=" * 80)


if __name__ == "__main__":
    main()

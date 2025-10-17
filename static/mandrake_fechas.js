// MandrakeBot Fechas Exámenes - unificado
(function () {
  if (!window.__mandrakeStats) window.__mandrakeStats = {};
  if (!window.__mandrakeStats.fechas) {
    window.__mandrakeStats.fechas = {
      aplicadas: 0,
      rechazadas: 0,
      detalle: [],
    };
  }

  function aISO(fecha) {
    if (!fecha) return "";
    const m = String(fecha)
      .trim()
      .match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!m) {
      // si ya es ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(fecha).trim()))
        return String(fecha).trim();
      return ""; // formato desconocido
    }
    const [_, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  function validarRango(iso) {
    if (!iso) return false;
    const dt = new Date(iso);
    if (isNaN(dt)) return false;
    if (dt < new Date("1900-01-01")) return false;
    const maxFut = new Date();
    maxFut.setDate(maxFut.getDate() + 30);
    if (dt > maxFut) return false;
    return true;
  }

  function setFechaById(id, iso) {
    const el =
      document.getElementById(id) ||
      document.querySelector(`#${id}`) ||
      document.querySelector(`[name="${id}"]`);
    if (!el) return { id, ok: false, motivo: "Elemento no encontrado" };
    try {
      el.removeAttribute("readonly");
      el.disabled = false;
    } catch (_) {}
    el.value = iso;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { id, ok: true, valor: iso };
  }

  const MAP = {
    influenza_fecha: {
      id: "fecha_influenza",
      aliases: ["vacuna_influenza_fecha", "influenza_fecha", "fecha_influenza"],
    },
    neumococo_fecha: {
      id: "fecha_neumococo",
      aliases: ["neumococo_fecha", "fecha_neumococo"],
    },
    ekg_fecha: {
      id: "fecha_ekg",
      aliases: ["ekg_fecha", "ecg_fecha", "fecha_ekg", "fecha_ecg"],
    },
    mamografia_fecha: {
      id: "mamografia_fecha",
      aliases: ["mamografia_fecha", "mamografía_fecha", "fecha_mamografia"],
    },
    creatinina_fecha: {
      id: "fecha_creatinina",
      aliases: ["creatinina_fecha", "fecha_creatinina"],
    },
    lipidos_fecha: {
      id: "fecha_lipidos",
      aliases: [
        "lipidos_fecha",
        "colesterol_fecha",
        "fecha_lipidos",
        "perfil_lipidico_fecha",
      ],
    },
    pap_fecha: { id: "pap_fecha", aliases: ["pap_fecha", "fecha_pap"] },
    hba1c_fecha: {
      id: "hba1c_examen",
      aliases: ["hba1c_fecha", "hba1c_examen", "hba1c"],
    },
  };

  function aplicarFechasExamenes(datos) {
    datos = datos || {};
    const resultados = [];
    for (const [key, cfg] of Object.entries(MAP)) {
      const valor = cfg.aliases
        .map((a) => datos[a])
        .find((v) => v != null && v !== "");
      if (!valor) continue;
      const iso = aISO(valor);
      if (!iso) {
        resultados.push({
          campo: key,
          id: cfg.id,
          ok: false,
          motivo: "Formato no reconocido",
          entrada: valor,
        });
        continue;
      }
      if (!validarRango(iso)) {
        resultados.push({
          campo: key,
          id: cfg.id,
          ok: false,
          motivo: "Fuera de rango",
          valor: iso,
        });
        continue;
      }
      const r = setFechaById(cfg.id, iso);
      resultados.push({ campo: key, ...r });
    }
    // métricas
    const stats = window.__mandrakeStats.fechas;
    for (const r of resultados) {
      if (r.ok) stats.aplicadas++;
      else stats.rechazadas++;
      stats.detalle.push(r);
    }
    if (console.table) console.table(resultados);
    else console.log("Resultados fechas exámenes:", resultados);
    return resultados;
  }

  function aplicarFechaCampo(id, valor) {
    const iso = aISO(valor);
    if (!iso) return { id, ok: false, motivo: "Formato no reconocido" };
    if (!validarRango(iso))
      return { id, ok: false, motivo: "Fuera de rango", valor: iso };
    const r = setFechaById(id, iso);
    const stats = window.__mandrakeStats.fechas;
    if (r.ok) stats.aplicadas++;
    else stats.rechazadas++;
    stats.detalle.push(r);
    return r;
  }

  // Exponer global
  window.aplicarFechasExamenes = aplicarFechasExamenes;
  window.aplicarFechaCampo = aplicarFechaCampo;
})();

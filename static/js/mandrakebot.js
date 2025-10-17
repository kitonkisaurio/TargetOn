/* static/js/mandrakebot.js - API unificada Mandrake (extended advanced logic) */
(() => {
  "use strict";

  if (window.Mandrake?.__READY__) return;

  /* ===== Utilidades básicas ===== */
  function _safeParse(txt) {
    try {
      return JSON.parse(txt);
    } catch {
      const m = String(txt).match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch (_) {}
      }
      return {};
    }
  }
  function _sanitizeRun(run) {
    if (!run) return "";
    const s = String(run).replace(/\./g, "").replace(/-/g, "").toUpperCase();
    if (!s) return "";
    const cuerpo = s.slice(0, -1),
      dv = s.slice(-1);
    return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
  }

  /* ===== Regex diagnósticos (migrado) ===== */
  const DX_REGEX = [
    {
      re: /\b(hta|hipertensi[oó]n)\b/i,
      selectors: ["#dx_hta", 'input[name="dx_hta"]'],
    },
    {
      re: /\b(dm2|diabetes(?:\s+tipo\s*2)?)\b/i,
      selectors: ["#dx_dm", 'input[name="dx_dm"]'],
    },
    {
      re: /\b(fa|fibrilaci[oó]n\s+auricular)\b/i,
      selectors: ["#dx_fa", 'input[name="dx_fa"]'],
    },
    {
      re: /\b(icc|insuficiencia\s+card[ií]aca)\b/i,
      selectors: ["#dx_icc", 'input[name="dx_icc"]'],
    },
    {
      re: /\b(dlp|dislipidemia)\b/i,
      selectors: ["#dx_dlp", 'input[name="dx_dlp"]'],
    },
    {
      re: /\b(erc|enfermedad\s+renal\s+cr[oó]nica)\b/i,
      selectors: ["#dx_erc", 'input[name="dx_erc"]'],
    },
    {
      re: /\b(acv|ecv|infarto\s+cerebral|accidente\s+cerebrovascular)\b/i,
      selectors: ["#dx_ecv", 'input[name="dx_ecv"]'],
    },
    {
      re: /\b(ceguera|amaurosis|retinopat[ií]a\s+proliferativa)\b/i,
      selectors: ["#dx_ceguera", 'input[name="dx_ceguera"]'],
    },
  ];
  function _mark(selList, checked) {
    for (const sel of selList) {
      const el = document.querySelector(sel);
      if (el && el.type === "checkbox") {
        el.checked = !!checked;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }
  function _marcarDiagnosticosRegex(texto) {
    const t = String(texto || "");
    const marcados = [];
    for (const { re, selectors } of DX_REGEX) {
      if (re.test(t)) {
        if (_mark(selectors, true)) marcados.push(selectors[0]);
      }
    }
    return marcados;
  }

  /* ===== Helpers fechas (refactor sin cambio de contrato) ===== */
  const _pad2 = (n) => String(n).padStart(2, "0");

  const _fmtISO = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = _pad2(dateObj.getMonth() + 1);
    const d = _pad2(dateObj.getDate());
    return `${y}-${m}-${d}`;
  };

  const _dateFromISO = (iso) => {
    // Mantiene el comportamiento original: parse primitivo y deja caer en NaN si no es convertible
    const [y, m, d] = (iso || "").split("-").map(Number);
    return new Date(y, (m || 0) - 1, d);
  };

  const _hoyISO = () => {
    const d = new Date();
    return _fmtISO(d);
  };

  const _sumarDiasISO = (iso, dias) => {
    const dt = _dateFromISO(iso);
    dt.setDate(dt.getDate() + dias);
    return _fmtISO(dt);
  };

  const _normalizaFechaEntrada = (val) => {
    if (!val) return "";
    const s = String(val).trim();

    // Si ya es ISO YYYY-MM-DD, se devuelve tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // d{1,2}[/-.]m{1,2}[/-.]yyyy → YYYY-MM-DD con zero-pad
    const m = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (!m) return s;

    const d = _pad2(m[1]);
    const mo = _pad2(m[2]);
    const y = m[3];
    return `${y}-${mo}-${d}`;
  };

  const _validaRangoFecha = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;

    const min = "1900-01-01";
    const max = _sumarDiasISO(_hoyISO(), 30);

    // Comparación lexicográfica deliberada (válida para ISO YYYY-MM-DD)
    return iso >= min && iso <= max;
  };

  /* ===== Normalización avanzada de claves ===== */
  function _normalizeKeys(d) {
    d = d || {};
    return {
      run: d.run ?? d.rut ?? d.usuario_run ?? "",
      nombre: d.nombre ?? d.name ?? d.paciente ?? "",
      sexo: d.sexo ?? d.genero ?? "",
      fecha_nacimiento: d.fecha_nacimiento ?? d.fnac ?? d.fecha_nac ?? "",
      telefono: d.telefono ?? d.fono ?? "",
      direccion: d.direccion ?? d.dirección ?? "",
      motivo_consulta: d.motivo_consulta ?? d.motivo ?? "",
      hgt: d.hgt ?? d.glicemia ?? d.hemoglucotest ?? "",
      presion_sistolica:
        d.pa_sis ?? d.pa_sistolica ?? d.presion_sistolica ?? "",
      presion_diastolica:
        d.pa_dia ?? d.pa_diastolica ?? d.presion_diastolica ?? "",
      peso: d.peso ?? "",
      talla: d.talla ?? "",
      cc: d.cc ?? d.cintura ?? "",
      hba1c: d.hba1c ?? d.hb1ac ?? d.glicosilada ?? "",
      pap_fecha: d.pap_fecha ?? "",
      pap_estado: d.pap_estado ?? "",
      influenza_fecha: d.vacuna_influenza_fecha ?? d.influenza_fecha ?? "",
      neumococo_fecha: d.neumococo_fecha ?? "",
      ekg_fecha: d.ekg_fecha ?? "",
      mamografia_fecha: d.mamografia_fecha ?? d.mamografía_fecha ?? "",
      creatinina_fecha: d.creatinina_fecha ?? "",
      lipidos_fecha: d.lipidos_fecha ?? d.colesterol_fecha ?? "",
      texto: d.texto ?? d.texto_fuente ?? d.raw ?? "",
      diagnosticos: d.diagnosticos ?? d.dx ?? [],
    };
  }

  /* ===== Aplicación de valores a DOM (extendido) ===== */
  function _setValue(selectors, valor, opts = {}) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const oldVal = el.type === "checkbox" ? !!el.checked : el.value;
      let changed = false;
      if (el.tagName === "SELECT") {
        if (String(oldVal) !== String(valor)) {
          el.value = valor ?? "";
          if (el.value !== String(valor) && typeof valor === "string") {
            const low = valor.toLowerCase();
            const opt = Array.from(el.options).find(
              (o) => o.text.toLowerCase() === low,
            );
            if (opt) el.value = opt.value;
          }
          changed = String(oldVal) !== String(el.value);
        }
      } else if (el.type === "checkbox") {
        if (!!oldVal !== !!valor) {
          el.checked = !!valor;
          changed = true;
        }
      } else {
        if (String(oldVal) !== String(valor ?? "")) {
          el.value = valor ?? "";
          changed = true;
        }
      }
      if (changed) {
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        if (opts.onlyHighlightChanges) {
          el.classList.add("mdk-changed");
          setTimeout(() => el.classList.remove("mdk-changed"), 1200);
        }
      }
      return changed;
    }
    return false;
  }

  /* ===== Mapeo de campos ampliado ===== */
  const FIELD_MAP = {
    run: ["#run", 'input[name="run"]', "#input-run", '[name="usuario_id"]'],
    nombre: ["#nombre", 'input[name="nombre"]', "#input-nombre"],
    sexo: ["#sexo", 'select[name="sexo"]'],
    telefono: ["#telefono", 'input[name="telefono"]'],
    direccion: ["#direccion", 'input[name="direccion"]'],
    motivo_consulta: ["#motivo_consulta", 'textarea[name="motivo_consulta"]'],
    hgt: ["#hgt", 'input[name="hgt"]'],
    presion_sistolica: [
      "#presion_sistolica",
      'input[name="presion_sistolica"]',
    ],
    presion_diastolica: [
      "#presion_diastolica",
      'input[name="presion_diastolica"]',
    ],
    peso: ["#peso", 'input[name="peso"]'],
    talla: ["#talla", 'input[name="talla"]'],
    cc: ["#cc", 'input[name="cc"]'],
    hba1c: ["#hba1c", 'input[name="hba1c"]'],
    fecha_nacimiento: ["#fecha_nacimiento", 'input[name="fecha_nacimiento"]'],
    pap_fecha: ["#pap_fecha", 'input[name="pap_fecha"]'],
    pap_estado: [
      "#pap_estado",
      'select[name="pap_estado"]',
      'input[name="pap_estado"]',
    ],
    influenza_fecha: ["#influenza_fecha", 'input[name="influenza_fecha"]'],
    neumococo_fecha: ["#neumococo_fecha", 'input[name="neumococo_fecha"]'],
    ekg_fecha: ["#ekg_fecha", 'input[name="ekg_fecha"]'],
    mamografia_fecha: ["#mamografia_fecha", 'input[name="mamografia_fecha"]'],
    creatinina_fecha: ["#creatinina_fecha", 'input[name="creatinina_fecha"]'],
    lipidos_fecha: ["#lipidos_fecha", 'input[name="lipidos_fecha"]'],
  };

  // ===== Helpers puros (sin efectos salvo where se documenta) =====
  function normalizeRunField(norm) {
    if (norm.run) norm.run = _sanitizeRun(norm.run);
  }

  function normalizeDateFields(norm, fechaKeys) {
    for (const k of fechaKeys) {
      if (!norm[k]) continue;
      const iso = _normalizaFechaEntrada(norm[k]);
      norm[k] = _validaRangoFecha(iso) ? iso : "";
    }
  }

  function markDiagnosticosFromArray(norm) {
    if (Array.isArray(norm.diagnosticos) && norm.diagnosticos.length) {
      const joined = " " + norm.diagnosticos.join(" ") + " ";
      _marcarDiagnosticosRegex(joined);
    }
  }

  function extractDatesFromText(norm, desc, pairs) {
    // Rescata una ventana alrededor del keyword y busca fecha dd/mm/yyyy (o variantes - .)
    for (const [
      kw,
      keyNorm /*, keyMap (ignorado intencionalmente, era redundante)*/,
    ] of pairs) {
      const reWin = new RegExp(`.{0,50}${kw}.{0,80}`, "i");
      const win = desc.match(reWin)?.[0] || "";
      const m = win.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/);
      if (m) {
        const iso = _normalizaFechaEntrada(m[1]);
        if (_validaRangoFecha(iso)) norm[keyNorm] = iso;
      }
    }
  }

  function applyPapEstadoHeuristics(norm, desc) {
    if (/vigente/i.test(desc) && !norm.pap_estado) norm.pap_estado = "vigente";
    if (/pendiente/i.test(desc) && !norm.pap_estado)
      norm.pap_estado = "pendiente";
  }

  function markDiagnosticosFromText(norm) {
    if (!norm.texto) return;
    _marcarDiagnosticosRegex(norm.texto);
    const desc = String(norm.texto || "").toLowerCase();
    const pairs = [
      ["pap", "pap_fecha", "pap_fecha"],
      ["influenza", "influenza_fecha", "influenza_fecha"],
      ["neumococo", "neumococo_fecha", "neumococo_fecha"],
      ["ekg", "ekg_fecha", "ekg_fecha"],
      ["mamograf", "mamografia_fecha", "mamografia_fecha"],
      ["creatinina", "creatinina_fecha", "creatinina_fecha"],
      ["colesterol", "lipidos_fecha", "lipidos_fecha"],
      ["l[ií]pidos", "lipidos_fecha", "lipidos_fecha"],
    ];
    extractDatesFromText(norm, desc, pairs);
    applyPapEstadoHeuristics(norm, desc);
  }

  // ===== Procesamiento especial de acuerdos =====
  function _processAcuerdosExtraction(acuerdos, opts = {}) {
    console.log('🤖 MandrakeBot procesando acuerdos extraídos:', acuerdos);
    
    // Mostrar notificación de acuerdos extraídos
    _showAcuerdosNotification(acuerdos.length);
    
    // Buscar si hay tabla de acuerdos en la interfaz para actualizar
    const tablaAcuerdos = document.querySelector('#tabla-acuerdos tbody') || 
                         document.querySelector('#hist-acuerdos-tbody');
    
    if (tablaAcuerdos) {
      // Si hay tabla, agregar filas visuales (solo para mostrar, no guardar)
      _addAcuerdosToTable(tablaAcuerdos, acuerdos);
    }
    
    // Si hay función de actualización de acuerdos disponible, usarla
    if (typeof window.actualizarTablaAcuerdos === 'function') {
      // Convertir formato AI a formato esperado por la tabla
      const acuerdosFormatted = acuerdos.map((acuerdo, index) => ({
        id: `ai_${Date.now()}_${index}`,
        usuario_id: _extractRunFromForm() || 'AI_USER',
        acuerdos: acuerdo.texto || '',
        cumplimiento: acuerdo.cumplimiento || 'inicio de acuerdos consensuados',
        observaciones: `Extraído por MandrakeBot - ${new Date().toLocaleString()}`,
        fecha_creacion: acuerdo.fecha || new Date().toISOString().split('T')[0]
      }));
      
      try {
        window.actualizarTablaAcuerdos(acuerdosFormatted);
      } catch (e) {
        console.warn('Error actualizando tabla acuerdos:', e);
      }
    }
    
    // Mostrar en consola para debug
    console.table(acuerdos.map(a => ({
      fecha: a.fecha || 'Hoy',
      texto: (a.texto || '').substring(0, 60) + '...',
      cumplimiento: a.cumplimiento || 'inicio de acuerdos consensuados'
    })));
  }
  
  function _showAcuerdosNotification(count) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #22c55e; color: white; padding: 12px 20px;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px; font-weight: 600;
      animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `✅ MandrakeBot extrajo ${count} acuerdo${count > 1 ? 's' : ''}`;
    
    // Agregar animación CSS
    if (!document.querySelector('#mandrake-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'mandrake-notification-styles';
      styles.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Remover después de 4 segundos
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
  
  function _addAcuerdosToTable(tbody, acuerdos) {
    // Agregar filas a la tabla existente (solo visual)
    acuerdos.forEach((acuerdo, index) => {
      const row = document.createElement('tr');
      row.style.background = '#f0f9ff'; // Color distintivo para acuerdos de AI
      row.innerHTML = `
        <td style="padding:4px;font-size:0.7rem;">${acuerdo.fecha || 'Hoy'}</td>
        <td style="padding:4px;font-size:0.7rem;">${acuerdo.texto || ''}</td>
        <td style="padding:4px;font-size:0.7rem;">${(acuerdo.cumplimiento || 'inicio de acuerdos consensuados').toUpperCase()}</td>
        <td style="padding:4px;font-size:0.7rem;">MandrakeBot</td>
        <td style="padding:4px;font-size:0.7rem;color:#0ea5e9;">Extraído por AI - No guardado</td>
      `;
      tbody.insertBefore(row, tbody.firstChild); // Agregar al principio
    });
  }
  
  function _extractRunFromForm() {
    // Intentar extraer RUN del formulario actual
    const runSelectors = FIELD_MAP.run || [];
    for (const selector of runSelectors) {
      const el = document.querySelector(selector);
      if (el && el.value) {
        return el.value.trim();
      }
    }
    return null;
  }

  // ===== API Mandrake (MISMOS nombres/firmas) =====
  const Mandrake = {
    __READY__: true,
    normalizeBasic(input) {
      const src = typeof input === "string" ? _safeParse(input) : input || {};
      const out = { ...src };
      if (typeof out.run === "string") out.run = _sanitizeRun(out.run.trim());
      if (typeof out.nombre === "string") out.nombre = out.nombre.trim();
      return out;
    },
    normalizeAdvanced(input) {
      const baseRaw =
        typeof input === "string" ? _safeParse(input) : input || {};
      const norm = _normalizeKeys(baseRaw);

      // 1) RUN
      normalizeRunField(norm);

      // 2) Fechas individuales (validación)
      const fechaKeys = [
        "fecha_nacimiento",
        "pap_fecha",
        "influenza_fecha",
        "neumococo_fecha",
        "ekg_fecha",
        "mamografia_fecha",
        "creatinina_fecha",
        "lipidos_fecha",
      ];
      normalizeDateFields(norm, fechaKeys);

      // 3) Diagnósticos desde arrays
      markDiagnosticosFromArray(norm);

      // 4) Diagnósticos + heurísticas desde texto libre (incluye extracción de fechas por pares)
      markDiagnosticosFromText(norm);

      return norm;
    },
    apply(input, opts = {}) {
      const mode = (opts.mode || "basic").toLowerCase();
      const data =
        mode === "advanced"
          ? Mandrake.normalizeAdvanced(input)
          : Mandrake.normalizeBasic(input);
      Mandrake.__applyToForm(data, opts);
      return data;
    },
    __applyToForm(data, opts) {
      // Procesar campos regulares
      for (const [key, selectors] of Object.entries(FIELD_MAP)) {
        if (data[key] == null || data[key] === "") continue;
        _setValue(selectors, data[key], opts);
      }
      
      // Procesar acuerdos especialmente
      if (data.acuerdos && Array.isArray(data.acuerdos) && data.acuerdos.length > 0) {
        _processAcuerdosExtraction(data.acuerdos, opts);
      }
    },
    initMandrakeBridge() {
      const btn =
        document.getElementById("btn-aplicar-mandrake") ||
        document.getElementById("aplicar-formulario");
      const panel =
        document.getElementById("mandrake-json") ||
        document.querySelector("[data-json-target]");
      if (btn) {
        btn.addEventListener("click", () => {
          let raw = panel ? panel.value || panel.textContent : "{}";
          try {
            Mandrake.apply(raw, { mode: "advanced" });
          } catch (e) {
            console.warn("[Mandrake] fallo aplicando:", e);
          }
        });
      }
    },
  };

  window.Mandrake = Mandrake;
  window.MandrakeApply = (data) => Mandrake.apply(data, { mode: "advanced" });
  window.aplicarDatosBot = (data) => Mandrake.apply(data, { mode: "basic" });
  window.initMandrakeBridge = () => Mandrake.initMandrakeBridge();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      try {
        Mandrake.initMandrakeBridge();
      } catch (e) {
        console.warn("[Mandrake] init diferido", e);
      }
    });
  } else {
    try {
      Mandrake.initMandrakeBridge();
    } catch (e) {
      console.warn("[Mandrake] init inmediato", e);
    }
  }
})();

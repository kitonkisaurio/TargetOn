// screening_utils.js - lógica modularizada para Screening (mamografía, PAP, PSA)
// Asume existencia de elementos con IDs: btn_guardar_screening y select/inputs con prefijos: screening_[codigo]_fecha, screening_[codigo]_estado, screening_psa_valor
// Requiere que window.normalizeRun (si existe) o función local para limpiar RUN.

(function (global) {
  const Q = (s) => document.querySelector(s);
  const QA = (s) => Array.from(document.querySelectorAll(s));
  const byName = (n) => document.querySelector(`[name="${n}"]`);

  function getRun() {
    try {
      if (typeof global.runRaw === "function") {
        const r = global.runRaw();
        return (r || "").trim();
      }
    } catch (_) {}
    const v = document.querySelector('input[name="run"]')?.value || "";
    return v.trim();
  }

  function parseFechaFlexible(s) {
    if (!s) return null;
    const str = String(s).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + "T00:00:00");
    // DD/MM/YYYY
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
    if (m) {
      const [_, dd, mm, yyyy] = m;
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    }
    // Fallback Date()
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }

  function calcularEdad(fechaStr) {
    const d = parseFechaFlexible(fechaStr);
    if (!d) return null;
    const h = new Date();
    let e = h.getFullYear() - d.getFullYear();
    const m = h.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < d.getDate())) e--;
    return e;
  }

  function normalizarSexo(sexo) {
    const s = String(sexo || "")
      .trim()
      .toLowerCase();
    if (["f", "femenino", "mujer"].includes(s)) return "F";
    if (["m", "masculino", "hombre", "varón", "varon"].includes(s)) return "M";
    return "";
  }

  function elegibilidad(sexo, edad) {
    const sx = normalizarSexo(sexo);
    const ok = (n) => typeof n === "number" && !isNaN(n);
    return {
      pap: sx === "F" && ok(edad) && edad >= 25 && edad <= 64,
      mamografia: sx === "F" && ok(edad) && edad >= 50,
      psa: sx === "M" && ok(edad) && edad >= 45,
    };
  }

  function setCardState(cardId, badgeId, elegible, vigenciaInfo = null) {
    const card = Q("#" + cardId);
    const badge = Q("#" + badgeId);
    if (!card) return;
    if (elegible) {
      card.classList.remove("hidden");
      card.style.display = "";
    } else {
      card.classList.add("hidden");
      card.style.display = "none";
    }
    // Siempre permitir edición mientras sea elegible (aunque esté vigente) para registrar nuevo evento.
    const inputs = QA("#" + cardId + " input, #" + cardId + " select");
    inputs.forEach((el) => {
      if (!elegible) {
        el.disabled = true;
        if (el.tagName === "INPUT") el.value = "";
      } else {
        // Nunca bloquear, independientemente de vigencia
        el.disabled = false;
        el.readOnly = false;
        el.classList.remove("disabled");
      }
    });

    if (badge) {
      // Si no es elegible, mostrar "No elegible"
      if (!elegible) {
        badge.textContent = "No elegible";
        badge.className = "badge-noelig";
        return;
      }

      // Si es elegible pero no hay datos Y no hay fecha cargada -> mostrar "Registrar"
      if (!vigenciaInfo || (vigenciaInfo && vigenciaInfo.sinFecha)) {
        badge.textContent = "Registrar";
        badge.className = "badge-elig";
        badge.style.background = "#e0f2fe";
        badge.style.color = "#0369a1";
        return;
      }

      // Mostrar vigencia según los datos
      if (vigenciaInfo.vigente) {
        badge.textContent = "✅ Vigente";
        badge.className = "badge-elig";
        badge.style.background = "#dcfce7";
        badge.style.color = "#15803d";
      } else {
        badge.textContent = "⚠️ No vigente";
        badge.className = "badge-elig";
        badge.style.background = "#fef3c7";
        badge.style.color = "#d97706";
      }
    }
  }

  function calcularVigencia(codigo, data, sexo, edad) {
    if (!data || !data.fecha)
      return { vigente: false, razon: "Sin fecha registrada", sinFecha: true };

    const fechaExamen = new Date(data.fecha);
    const hoy = new Date();
    const diasTranscurridos = Math.floor(
      (hoy - fechaExamen) / (1000 * 60 * 60 * 24),
    );

    // Lógica de vigencia según código
    if (codigo === "pap") {
      // PAP: Femenino 25-64 años, vigente si estado=al_dia y fecha < 3 años (1095 días)
      const elegible = normalizarSexo(sexo) === "F" && edad >= 25 && edad <= 64;
      if (!elegible)
        return { vigente: false, razon: "No elegible por edad/sexo" };

      const estadoVigente = (data.estado || "").toLowerCase() === "al_dia";
      const vPap = (window.getVigencia && window.getVigencia("pap")) || 1095;
      const fechaVigente = diasTranscurridos < vPap; // 3 años configurable

      return {
        vigente: estadoVigente && fechaVigente,
        razon: !estadoVigente
          ? "Estado no vigente"
          : !fechaVigente
            ? "Fecha vencida (>3 años)"
            : "Vigente",
      };
    }

    if (codigo === "mamografia") {
      // Mamografía: Femenino ≥50 años, vigente si estado=realizada y fecha < 2 años (730 días)
      const elegible = normalizarSexo(sexo) === "F" && edad >= 50;
      if (!elegible)
        return { vigente: false, razon: "No elegible por edad/sexo" };

      const estadoVigente = ["realizada", "hecha"].includes(
        (data.estado || "").toLowerCase(),
      );
      const vMamo =
        (window.getVigencia && window.getVigencia("mamografia")) || 730;
      const fechaVigente = diasTranscurridos < vMamo; // 2 años configurable

      return {
        vigente: estadoVigente && fechaVigente,
        razon: !estadoVigente
          ? "Estado no vigente"
          : !fechaVigente
            ? "Fecha vencida (>2 años)"
            : "Vigente",
      };
    }

    if (codigo === "psa") {
      // PSA: Masculino ≥45 años, vigente si psa_valor existe y fecha < 1 año (365 días)
      const elegible = normalizarSexo(sexo) === "M" && edad >= 45;
      if (!elegible)
        return { vigente: false, razon: "No elegible por edad/sexo" };

      const valorVigente =
        data.psa_valor !== null && data.psa_valor !== undefined;
      const vPsa = (window.getVigencia && window.getVigencia("psa")) || 365;
      const fechaVigente = diasTranscurridos < vPsa; // 1 año configurable

      return {
        vigente: valorVigente && fechaVigente,
        razon: !valorVigente
          ? "Sin valor de PSA"
          : !fechaVigente
            ? "Fecha vencida (>1 año)"
            : "Vigente",
      };
    }

    return { vigente: false, razon: "Código no reconocido" };
  }

  async function cargarDatosScreening(run) {
    if (!run) return;

    try {
      const resp = await fetch(`/api/screening/${encodeURIComponent(run)}`);
      if (!resp.ok) return;

      const data = await resp.json();
      if (!data.success || !data.screening) return;

      // Obtener sexo y edad actuales
      const sexo = Q("#sexo")?.value || "";
      const fechaNac = Q("#fecha_nacimiento")?.value || "";
      const edad = calcularEdad(fechaNac);
      const el = elegibilidad(sexo, edad);

      // Cargar datos y calcular vigencia para cada screening
      const screening = data.screening;

      // PAP
      if (screening.pap && screening.pap.fecha) {
        const papVigencia = calcularVigencia("pap", screening.pap, sexo, edad);
        setCardState("card_pap", "badge_pap", el.pap, papVigencia);

        // Cargar datos en los campos
        if (el.pap) {
          const fechaField = byName("pap_fecha");
          const estadoField = byName("pap_estado");
          if (fechaField && screening.pap.fecha)
            fechaField.value = screening.pap.fecha;
          if (estadoField && screening.pap.estado)
            estadoField.value = screening.pap.estado;
        }
      } else if (el.pap) {
        setCardState("card_pap", "badge_pap", true, {
          vigente: false,
          razon: "Sin fecha registrada",
          sinFecha: true,
        });
      }

      // Mamografía
      if (screening.mamografia && screening.mamografia.fecha) {
        const mamoVigencia = calcularVigencia(
          "mamografia",
          screening.mamografia,
          sexo,
          edad,
        );
        setCardState(
          "card_mamografia",
          "badge_mamografia",
          el.mamografia,
          mamoVigencia,
        );

        // Cargar datos en los campos
        if (el.mamografia) {
          const fechaField = byName("mamografia_fecha");
          const estadoField = byName("mamografia_estado");
          if (fechaField && screening.mamografia.fecha)
            fechaField.value = screening.mamografia.fecha;
          if (estadoField && screening.mamografia.estado)
            estadoField.value = screening.mamografia.estado;
        }
      } else if (el.mamografia) {
        setCardState("card_mamografia", "badge_mamografia", true, {
          vigente: false,
          razon: "Sin fecha registrada",
          sinFecha: true,
        });
      }

      // PSA
      if (screening.psa) {
        const psaVigencia = calcularVigencia("psa", screening.psa, sexo, edad);
        setCardState("card_psa", "badge_psa", el.psa, psaVigencia);

        // Cargar datos en los campos
        if (el.psa) {
          const fechaField = byName("psa_fecha");
          const valorField = byName("psa_valor");
          if (fechaField && screening.psa.fecha)
            fechaField.value = screening.psa.fecha;
          if (valorField && screening.psa.psa_valor !== null)
            valorField.value = screening.psa.psa_valor;
        }
      } else if (el.psa) {
        setCardState("card_psa", "badge_psa", true, null);
      }
    } catch (e) {
      console.warn("[Screening] Error cargando datos:", e);
    }
  }

  function toggleSecciones({ sexo, fecha_nacimiento }) {
    const edad = calcularEdad(fecha_nacimiento);
    const el = elegibilidad(sexo, edad);
    setCardState("card_pap", "badge_pap", el.pap);
    setCardState("card_mamografia", "badge_mamografia", el.mamografia);
    setCardState("card_psa", "badge_psa", el.psa);
  }

  function update() {
    const sexo = Q("#sexo")?.value || "";
    const fnac = Q("#fecha_nacimiento")?.value || "";
    toggleSecciones({ sexo, fecha_nacimiento: fnac });
  }

  function attachListeners() {
    ["#sexo", "#fecha_nacimiento"].forEach((sel) => {
      const el = Q(sel);
      if (el) {
        el.addEventListener("change", update);
        el.addEventListener("input", update);
      }
    });
  }

  // Exponer API mínima
  global.ScreeningModule = {
    toggleSecciones,
    renderByUser(user) {
      toggleSecciones(user || {});
    },
    update,
    cargarDatosScreening,
    // ...existing code...
  };

  document.addEventListener("DOMContentLoaded", () => {
    try {
      attachListeners();
      update();
      // Fuerza dehabilitar cualquier atributo 'disabled' residual en campos de screening elegibles (PAP/Mamografía)
      ["pap", "mamografia"].forEach((code) => {
        const fecha = byName(code + "_fecha");
        const estado = byName(code + "_estado");
        [fecha, estado].forEach((el) => {
          if (el) {
            el.removeAttribute("disabled");
            el.readOnly = false;
            el.classList.remove("disabled");
          }
        });
      });
      // Wire: Guardar Screening
      const btn = Q("#btn_guardar_screening");
      if (btn && !btn.dataset.wired) {
        btn.dataset.wired = "1";
        btn.addEventListener("click", async () => {
          const statusEl = Q("#screening_status_msg");
          const run = getRun();
          if (!run) {
            if (statusEl) {
              statusEl.textContent = "Ingrese RUN antes de guardar";
              statusEl.style.color = "#b91c1c";
            }
            return;
          }

          // Construir payload solo con datos presentes y habilitados
          const payload = { run };
          const cardEnabled = (sel) => {
            const card = Q(sel);
            if (!card) return false;
            const hidden =
              card.classList?.contains("hidden") ||
              card.style.display === "none";
            return !hidden;
          };

          // Mamografía
          if (cardEnabled("#card_mamografia")) {
            const fecha = byName("mamografia_fecha")?.value || "";
            const estado = byName("mamografia_estado")?.value || "";
            if (estado) {
              payload.mamografia = { estado, ...(fecha ? { fecha } : {}) };
            }
          }
          // PAP
          if (cardEnabled("#card_pap")) {
            const fecha = byName("pap_fecha")?.value || "";
            const estado = byName("pap_estado")?.value || "";
            if (estado) {
              payload.pap = { estado, ...(fecha ? { fecha } : {}) };
            }
          }
          // PSA
          if (cardEnabled("#card_psa")) {
            const fecha = byName("psa_fecha")?.value || "";
            const valorRaw = byName("psa_valor")?.value || "";
            const obj = {};
            if (fecha) obj.fecha = fecha;
            if (valorRaw !== "") {
              const v = parseFloat(valorRaw);
              if (!isNaN(v)) obj.valor = v;
            }
            if (Object.keys(obj).length > 0) {
              payload.psa = obj;
            }
          }

          if (!payload.mamografia && !payload.pap && !payload.psa) {
            if (statusEl) {
              statusEl.textContent = "No hay cambios para guardar";
              statusEl.style.color = "#64748b";
            }
            return;
          }

          if (statusEl) {
            statusEl.textContent = "Guardando screening...";
            statusEl.style.color = "#0d47a1";
          }
          try {
            const resp = await fetch("/api/screening", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || data.success === false) {
              const msg =
                (data && (data.error || data.message)) ||
                `Error ${resp.status}`;
              if (statusEl) {
                statusEl.textContent = `❌ ${msg}`;
                statusEl.style.color = "#b91c1c";
              }
              return;
            }
            // Éxito
            const det = Array.isArray(data.resultados) ? data.resultados : [];
            const okCount = det.filter(
              (r) =>
                r.accion === "creado" ||
                r.accion === "actualizado" ||
                r.accion === "omitido",
            ).length;
            const errs = det.filter((r) => r.accion === "error");
            let resumen = `✅ Screening guardado (${okCount} ítems procesados`;
            if (errs.length) resumen += `, ${errs.length} con observaciones`;
            resumen += ")";
            if (statusEl) {
              statusEl.textContent = resumen;
              statusEl.style.color = "#0f766e";
            }
            // Limpiar mensaje luego de unos segundos
            setTimeout(() => {
              if (statusEl && statusEl.textContent === resumen)
                statusEl.textContent = "";
            }, 3500);
          } catch (e) {
            if (statusEl) {
              statusEl.textContent =
                "❌ Error de conexión al guardar screening";
              statusEl.style.color = "#b91c1c";
            }
          }
        });
      }

      // Guardados por ítem: PAP y Mamografía
      const statusEl = Q("#screening_status_msg");
      const wireItemSave = (cardSel, buildPayload, existingBtnId) => {
        const card = Q(cardSel);
        if (!card) return;
        let btn = existingBtnId ? Q(existingBtnId) : null;
        if (!btn) {
          // fallback a botón ya presente dentro de la tarjeta con id específico (papGuardarBtn / mamoGuardarBtn)
          btn = card.querySelector(
            'button[id$="GuardarBtn"], .btn-guardar-item',
          );
        }
        if (!btn) return; // no crear dinámicamente más
        btn.disabled = false;
        if (btn.dataset.wired) return; // evitar doble listener
        btn.dataset.wired = "1";
        btn.addEventListener("click", async () => {
          const run = getRun();
          if (!run) {
            if (statusEl) {
              statusEl.textContent = "Ingrese RUN antes de guardar";
              statusEl.style.color = "#b91c1c";
            }
            return;
          }
          const payload = buildPayload(run);
          if (!payload) return;
          if (statusEl) {
            statusEl.textContent = "Guardando...";
            statusEl.style.color = "#0d47a1";
          }
          try {
            const resp = await fetch("/api/screening", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || data.success === false) {
              const msg =
                (data && (data.error || data.message)) ||
                `Error ${resp.status}`;
              if (statusEl) {
                statusEl.textContent = `❌ ${msg}`;
                statusEl.style.color = "#b91c1c";
              }
              return;
            }
            if (statusEl) {
              statusEl.textContent = "✅ Guardado";
              statusEl.style.color = "#0f766e";
              setTimeout(() => {
                if (statusEl) statusEl.textContent = "";
              }, 2500);
            }
          } catch (e) {
            if (statusEl) {
              statusEl.textContent = "❌ Error de conexión";
              statusEl.style.color = "#b91c1c";
            }
          }
        });
      };

      // PAP
      wireItemSave(
        "#card_pap",
        (run) => {
          const card = Q("#card_pap");
          const hidden =
            !card ||
            card.classList.contains("hidden") ||
            card.style.display === "none";
          if (hidden) return null;
          const fecha = byName("pap_fecha")?.value || "";
          const estado = byName("pap_estado")?.value || "";
          if (!estado) return null;
          const o = { run, pap: { estado } };
          if (fecha) o.pap.fecha = fecha;
          return o;
        },
        "#papGuardarBtn",
      );

      // Mamografía
      wireItemSave(
        "#card_mamografia",
        (run) => {
          const card = Q("#card_mamografia");
          const hidden =
            !card ||
            card.classList.contains("hidden") ||
            card.style.display === "none";
          if (hidden) return null;
          const fecha = byName("mamografia_fecha")?.value || "";
          const estado = byName("mamografia_estado")?.value || "";
          if (!estado) return null;
          const o = { run, mamografia: { estado } };
          if (fecha) o.mamografia.fecha = fecha;
          return o;
        },
        "#mamoGuardarBtn",
      );

      // Botones "Nuevo Registro" para limpiar campos rápidamente
      function ensureNuevoBtn(cardId, fechaName, estadoName) {
        const card = Q(cardId);
        if (!card) return;
        let btn = card.querySelector(".btn-nuevo-registro");
        if (!btn) {
          btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn-outline-secondary btn-nuevo-registro";
          btn.style.cssText =
            "margin-left:6px; font-size:11px; padding:4px 8px; background:#1e293b; color:#e2e8f0;";
          btn.textContent = "🆕 Nuevo";
          const refBtn = card.querySelector(".btn-guardar-item");
          if (refBtn && refBtn.parentNode)
            refBtn.parentNode.insertBefore(btn, refBtn.nextSibling);
          else card.appendChild(btn);
          btn.addEventListener("click", () => {
            const f = byName(fechaName);
            if (f) f.value = "";
            const e = byName(estadoName);
            if (e) e.selectedIndex = 0;
            const statusEl = Q("#screening_status_msg");
            if (statusEl) {
              statusEl.textContent = "Listo para nuevo registro";
              statusEl.style.color = "#475569";
              setTimeout(() => {
                if (statusEl.textContent === "Listo para nuevo registro")
                  statusEl.textContent = "";
              }, 2000);
            }
          });
        }
      }
      ensureNuevoBtn("#card_pap", "pap_fecha", "pap_estado");
      ensureNuevoBtn(
        "#card_mamografia",
        "mamografia_fecha",
        "mamografia_estado",
      );
    } catch (e) {
      console.warn("[Screening] init error", e);
    }
  });
})(window);

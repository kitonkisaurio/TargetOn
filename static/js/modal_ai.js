/* static/js/modal_ai.js - UI del modal de MandrakeBot (extraído) */
(function () {
  "use strict";
  if (window.__MODAL_AI_INIT__) return;
  window.__MODAL_AI_INIT__ = true;

  function qs(id) {
    return document.getElementById(id);
  }
  const taTexto = qs("taTexto");
  const taSchema = qs("taSchema");
  const output = qs("json-output") || qs("output-json") || qs("output");
  const btnExtraer = qs("btnExtraer");
  const btnAplicar = qs("btnAplicar");
  const btnReaplicar = qs("btnReaplicar");
  const btnCopiar = qs("btnCopiar");
  const btnLimpiar = qs("btnLimpiar");
  const metaEl = qs("meta-model") || qs("modelo-meta");
  const chkCompact = qs("chkCompact") || qs("compacto");
  let ultimaRespuesta = null;
  let iaDeshabilitada = false;

  function setStatus(msg, level) {
    const st = qs("status-ai") || qs("status");
    if (st) {
      st.textContent = msg;
      st.dataset.level = level || "info";
    }
    console.log("[ModalAI]", msg);
  }

  function recolectarCampos() {
    const form = document.querySelector("form") || document;
    const mapa = {};
    form.querySelectorAll("input,select,textarea").forEach((el) => {
      const name = el.name || el.id;
      if (!name) return;
      (mapa[name] = mapa[name] || []).push(el);
    });
    return mapa;
  }

  function limpiarHighlights() {
    document
      .querySelectorAll(".ai-filled")
      .forEach((el) => el.classList.remove("ai-filled"));
  }

  function snapshotValores(mapa) {
    const out = {};
    Object.entries(mapa).forEach(([k, arr]) => {
      if (!arr.length) return;
      const el = arr[0];
      if (el.type === "checkbox") {
        const marc = arr.filter((c) => c.checked).map((c) => c.value);
        out[k] = marc.length > 1 ? marc : marc[0] || "";
      } else if (el.type === "radio") {
        const r = arr.find((r) => r.checked);
        out[k] = r ? r.value : "";
      } else {
        out[k] = el.value || "";
      }
    });
    return out;
  }

  function initListeners() {
    if (btnLimpiar) {
      btnLimpiar.addEventListener("click", () => {
        if (taTexto) taTexto.value = "";
        if (output) output.textContent = "{}";
        if (btnAplicar) {
          btnAplicar.disabled = true;
          btnAplicar.style.cursor = "not-allowed";
          btnAplicar.style.background = "#1e293b";
        }
        if (btnCopiar) {
          btnCopiar.disabled = true;
          btnCopiar.style.cursor = "not-allowed";
        }
        if (btnReaplicar) {
          btnReaplicar.disabled = true;
          btnReaplicar.style.cursor = "not-allowed";
          btnReaplicar.style.background = "#1e293b";
        }
        limpiarHighlights();
        ultimaRespuesta = null;
        setStatus("Listo.");
      });
    }

    if (btnExtraer) {
      btnExtraer.addEventListener("click", async () => {
        limpiarHighlights();
        const raw = (taTexto && taTexto.value.trim()) || "";
        if (!raw) {
          setStatus("Pega algún texto primero.", "warn");
          return;
        }
        let schemaObj = null;
        try {
          schemaObj = JSON.parse(taSchema.value);
        } catch (e) {
          setStatus("Schema inválido JSON", "error");
          return;
        }
        setStatus("Enviando al modelo...");
        btnExtraer.disabled = true;
        btnExtraer.textContent = "Procesando...";
        try {
          const camposMapa = recolectarCampos();
          const listaCampos = Object.keys(camposMapa).sort();
          const snapshot = snapshotValores(camposMapa);
          const instruction =
            "Extrae todos los datos clínicos y demográficos posibles y devuélvelos con las keys existentes del formulario (sin inventar). Solo usar keys ya presentes. Mantener formato ISO fechas (YYYY-MM-DD). Para checkboxes múltiples devolver array de valores.";
          const resp = await fetch("/api/ai/fill-form", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: raw,
              schema: schemaObj,
              instruction,
              campos: listaCampos,
              existentes: snapshot,
            }),
          });
          const js = await resp.json();
          if (!resp.ok || !js.success) {
            if (output) output.textContent = JSON.stringify(js, null, 2);
            const errCode = js.error || "desconocido";
            setStatus("Error: " + errCode, "error");
            if (errCode === "AI_DISABLED") {
              iaDeshabilitada = true;
              const banner = qs("ai-disabled-banner");
              if (banner) banner.style.display = "block";
              if (btnExtraer) {
                btnExtraer.disabled = true;
                btnExtraer.style.background = "#1e293b";
                btnExtraer.style.cursor = "not-allowed";
              }
              if (btnAplicar) {
                btnAplicar.disabled = true;
                btnAplicar.style.background = "#1e293b";
              }
            }
            if (btnAplicar) {
              btnAplicar.disabled = true;
              btnAplicar.style.background = "#1e293b";
            }
          } else {
            ultimaRespuesta = js;
            const pretty =
              chkCompact && chkCompact.checked
                ? JSON.stringify(js.data)
                : JSON.stringify(js.data, null, 2);
            if (output) output.textContent = pretty;
            setStatus("Listo. Puedes aplicar.");
            if (metaEl)
              metaEl.textContent =
                "Modelo: " +
                (js.meta && js.meta.model ? js.meta.model : "(desconocido)") +
                (js.meta && js.meta.cached ? " (cache)" : "");
            if (btnAplicar) {
              btnAplicar.disabled = false;
              btnAplicar.style.background = "#22c55e";
              btnAplicar.style.cursor = "pointer";
            }
            if (btnReaplicar) {
              btnReaplicar.disabled = false;
              btnReaplicar.style.background = "#0d9488";
              btnReaplicar.style.color = "#fff";
              btnReaplicar.style.cursor = "pointer";
            }
            if (btnCopiar) {
              btnCopiar.disabled = false;
              btnCopiar.style.cursor = "pointer";
              btnCopiar.style.background = "#1e293b";
              btnCopiar.style.color = "#e2e8f0";
            }
          }
        } catch (e) {
          if (output) output.textContent = '{"_error":"fetch_failed"}';
          setStatus("Fallo de red o servidor.", "error");
        } finally {
          if (!iaDeshabilitada) {
            if (btnExtraer) {
              btnExtraer.disabled = false;
              btnExtraer.textContent = "🤖 Extraer con MandrakeBot";
            }
          } else {
            if (btnExtraer)
              btnExtraer.textContent = "MandrakeBot deshabilitado";
          }
        }
      });
    }

    if (btnAplicar) {
      btnAplicar.addEventListener("click", () => {
        if (!ultimaRespuesta || !ultimaRespuesta.data) {
          setStatus("No hay datos aplicables", "warn");
          return;
        }
        window.Mandrake.apply(ultimaRespuesta.data, { mode: "advanced" });
        setStatus("Campos aplicados por MandrakeBot. Revisa y guarda.");
      });
    }

    if (btnReaplicar) {
      btnReaplicar.addEventListener("click", () => {
        if (!ultimaRespuesta || !ultimaRespuesta.data) {
          setStatus("No hay datos para reaplicar", "warn");
          return;
        }
        window.Mandrake.apply(ultimaRespuesta.data, { mode: "advanced" });
        setStatus("Reaplicado último JSON a los campos.");
      });
    }

    if (btnCopiar) {
      btnCopiar.addEventListener("click", () => {
        try {
          navigator.clipboard.writeText(output?.textContent || "");
          setStatus("JSON copiado (MandrakeBot).");
        } catch (_) {
          setStatus("No se pudo copiar.", "warn");
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initListeners);
  } else {
    initListeners();
  }
})();

/* static/js/hardening.js */
/* eslint-disable no-console */
(function () {
  // Evita doble-inicialización
  if (window.__HARDENING_READY__) return;
  window.__HARDENING_READY__ = true;

  // =========================================================
  // 1) Gate manual para alertas
  //    - Bloquea invocación automática hasta que el usuario haga clic en "Ver alertas"
  // =========================================================
  window.__ALERTAS_HABILITADAS_MANUALMENTE__ =
    window.__ALERTAS_HABILITADAS_MANUALMENTE__ || false;

  (function () {
    const original = window.invocarAlertasSeguro;
    window.invocarAlertasSeguro = function () {
      if (!window.__ALERTAS_HABILITADAS_MANUALMENTE__) {
        console.warn(
          "[hardening] invocarAlertasSeguro() bloqueado hasta habilitación manual.",
        );
        return;
      }
      return typeof original === "function" ? original() : undefined;
    };
  })();

  // =========================================================
  // 2) Helpers de tabs de alertas (seguros)
  //    - No trepan en el DOM, solo escriben en el host .alerts-content si existe
  // =========================================================
  (function () {
    const hostSel = ".alerts-content";
    function safeSet(el, html) {
      if (el) el.innerHTML = html;
    }

    function patch(name, renderHtml) {
      const original = window[name];
      window[name] = function (msg) {
        const host = document.querySelector(hostSel);
        if (!host) {
          console.warn("[hardening]", name, "sin host");
          return;
        }
        safeSet(host, renderHtml(msg));
        if (typeof original === "function") {
          try {
            original(msg);
          } catch (_e) {}
        }
      };
    }

    window.mostrarLoadingEnTabs &&
      patch(
        "mostrarLoadingEnTabs",
        () =>
          '<div style="padding:8px;text-align:center;font-size:11px">⚡ Cargando alertas...</div>',
      );
    window.mostrarErrorEnTabs &&
      patch(
        "mostrarErrorEnTabs",
        (m) =>
          `<div style="padding:8px;text-align:center;color:#dc2626;font-size:11px">❌ ${m || "Error"}</div>`,
      );
    window.mostrarMensajeEnTabs &&
      patch(
        "mostrarMensajeEnTabs",
        (m) =>
          `<div style="padding:8px;text-align:center;color:#f59e0b;font-size:11px">${m || ""}</div>`,
      );
  })();

  // =========================================================
  // 3) RUN watcher + RUN guard
  //    - Registra cambios y evita que scripts externos lo dejen vacío sin acción del usuario
  // =========================================================
  (function () {
    const runEl = document.querySelector('[name="run"], [name="usuario_id"]');
    if (!runEl) return;

    // Watcher (log con stack cuando queda vacío)
    let lastVal = runEl.value || "";
    let t;
    function logChange(reason) {
      const snapshot = {
        reason,
        value: runEl.value || "",
        time: new Date().toISOString(),
        stack: new Error("trace").stack,
      };
      console.debug("[RUN-watch]", snapshot);
    }
    runEl.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if ((runEl.value || "") !== lastVal) {
          if (!runEl.value) logChange("vacío tras input");
          lastVal = runEl.value || "";
        }
      }, 100);
    });

    // Guard (restaura si se vacía por mutación ajena)
    let cambioUsuario = false;
    runEl.addEventListener("input", () => {
      cambioUsuario = true;
    });

    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        if ((runEl.value || "") !== lastVal) {
          if (!runEl.value && !cambioUsuario) {
            runEl.value = lastVal;
            console.debug("[RUN-guard] restaurado por mutación ajena");
          } else {
            lastVal = runEl.value || "";
          }
        }
        cambioUsuario = false;
      }, 50);
    });
    mo.observe(runEl, { attributes: true, attributeFilter: ["value"] });
  })();

  // =========================================================
  // 4) Overlays/paneles: arrancar SIEMPRE cerrados
  // =========================================================
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".sidebar-overlay")?.classList.remove("show");
    document.querySelector(".health-alerts-floating")?.classList.remove("show");

    // Botón manual “Ver alertas”
    const btn = document.getElementById("btn-ver-alertas");
    const estado = document.getElementById("estado-alertas");
    const setEstado = (txt) => {
      if (estado) estado.textContent = txt;
    };

    if (btn) {
      btn.addEventListener("click", async () => {
        try {
          window.__ALERTAS_HABILITADAS_MANUALMENTE__ = true;
          setEstado && setEstado("Cargando alertas…");
          if (typeof window.invocarAlertasSeguro === "function") {
            await window.invocarAlertasSeguro();
          } else if (typeof window.cargarAlertasEmergencia === "function") {
            await window.cargarAlertasEmergencia();
          }
          setEstado && setEstado("Alertas solicitadas");
        } catch (e) {
          console.warn("[alertas] fallo en carga:", e);
          setEstado && setEstado("No fue posible cargar alertas");
        }
      });
    }
  });
})();

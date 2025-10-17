// Módulo Alertas
// API: { mount(slot, options), getValues(), validate(), destroy() }
// Carga fragmento /fragments/alertas. getValues por ahora vacío.

window.ECICEP = window.ECICEP || {};

(function (ns) {
  let root;
  let idRoot = "mod-alertas";
  let mounted = false;

  async function mount(slot, options = {}) {
    if (!slot) throw new Error("Slot inválido para mod-alertas");
    idRoot = options.idRoot || idRoot;
    const params = new URLSearchParams({ id_root: idRoot });
    const url = `/fragments/alertas?${params.toString()}`;
    let resp;
    try {
      resp = await fetch(url, { credentials: "same-origin" });
    } catch (e) {
      console.error("[alertas] Error de red cargando fragmento:", e);
      throw e;
    }
    if (!resp.ok) {
      console.error("[alertas] Respuesta no OK", resp.status);
      throw new Error("No se pudo cargar fragmento alertas");
    }
    const html = await resp.text();
    slot.innerHTML = html;
    root = document.getElementById(idRoot);
    if (!root) {
      console.warn("[alertas] No se encontró root tras montar");
    }
    mounted = true;
  }

  function getValues() {
    // Futuro: recopilar estado de tabs, conteos, etc.
    return { alertas: {} };
  }

  function validate() {
    return { ok: true, errors: [] };
  }

  function destroy() {
    mounted = false;
    root = undefined;
  }

  ns.alertas = { mount, getValues, validate, destroy };
})(window.ECICEP);

// Módulo Riesgo
// API: { mount(slot, options), getValues(), validate(), destroy() }
// Carga fragmento /fragments/riesgo y expone valores riesgo_cv / riesgo_cv_clasificacion

window.ECICEP = window.ECICEP || {};

(function (ns) {
  let root; // nodo raíz del fragmento montado
  let idRoot = "mod-riesgo";
  let mounted = false;

  async function mount(slot, options = {}) {
    if (!slot) throw new Error("Slot inválido para mod-riesgo");
    idRoot = options.idRoot || idRoot;
    const params = new URLSearchParams({ id_root: idRoot });
    const url = `/fragments/riesgo?${params.toString()}`;
    let resp;
    try {
      resp = await fetch(url, { credentials: "same-origin" });
    } catch (e) {
      console.error("[riesgo] Error de red cargando fragmento:", e);
      throw e;
    }
    if (!resp.ok) {
      console.error("[riesgo] Respuesta no OK", resp.status);
      throw new Error("No se pudo cargar fragmento riesgo");
    }
    const html = await resp.text();
    slot.innerHTML = html;
    root = document.getElementById(idRoot);
    if (!root) {
      console.warn("[riesgo] No se encontró root tras montar");
    }
    mounted = true;
  }

  function getValues() {
    if (!mounted || !root)
      return { riesgo_cv: "", riesgo_cv_clasificacion: "" };
    const riesgo = root.querySelector('input[name="riesgo_cv"]');
    const clasif = root.querySelector('input[name="riesgo_cv_clasificacion"]');
    return {
      riesgo_cv: riesgo ? riesgo.value || "" : "",
      riesgo_cv_clasificacion: clasif ? clasif.value || "" : "",
    };
  }

  function validate() {
    // Validaciones futuras (ej: rango numérico, clasificación obligatoria si riesgo presente)
    return { ok: true, errors: [] };
  }

  function destroy() {
    mounted = false;
    root = undefined;
  }

  ns.riesgo = { mount, getValues, validate, destroy };
})(window.ECICEP);

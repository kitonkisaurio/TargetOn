// Módulo Patologías
// API: { mount(slot, options), getValues(), validate(), destroy() }
// Carga fragmento /fragments/patologias y expone selección de checkboxes patologias[]

window.ECICEP = window.ECICEP || {};

(function (ns) {
  let root; // nodo raíz del fragmento montado
  let idRoot = "mod-patologias";
  let mounted = false;

  async function mount(slot, options = {}) {
    if (!slot) throw new Error("Slot inválido para mod-patologias");
    idRoot = options.idRoot || idRoot;
    const params = new URLSearchParams({
      id_root: idRoot,
      name: "patologias[]",
    });
    if (options.selected && Array.isArray(options.selected)) {
      for (const v of options.selected) {
        params.append("sel", v);
      }
    }
    const url = `/fragments/patologias?${params.toString()}`;
    let resp;
    try {
      resp = await fetch(url, { credentials: "same-origin" });
    } catch (e) {
      console.error("[patologias] Error de red cargando fragmento:", e);
      throw e;
    }
    if (!resp.ok) {
      console.error("[patologias] Respuesta no OK", resp.status);
      throw new Error("No se pudo cargar fragmento patologías");
    }
    const html = await resp.text();
    slot.innerHTML = html;
    root = document.getElementById(idRoot);
    if (!root) {
      console.warn("[patologias] No se encontró root tras montar");
    }
    mounted = true;
  }

  function getValues() {
    if (!mounted || !root) return { patologias: [] };
    const vals = Array.from(
      root.querySelectorAll('input[name="patologias[]"]:checked'),
    ).map((el) => el.value);
    return { patologias: vals };
  }

  function validate() {
    // Validaciones futuras (ejemplo: mínimo 0 permitido ahora)
    return { ok: true, errors: [] };
  }

  function destroy() {
    // Limpieza futura si agregamos listeners propios
    mounted = false;
    root = undefined;
  }

  ns.patologias = { mount, getValues, validate, destroy };
})(window.ECICEP);

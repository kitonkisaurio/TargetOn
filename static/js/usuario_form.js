// Orquestador del formulario ECICEP
// Monta módulos, valida y consolida datos antes del submit.

(function () {
  // === Configuración de módulos y slots ===
  const modules = [
    {
      key: "patologias",
      api: () => window.ECICEP?.patologias,
      slotId: "slot-patologias",
      idRoot: "mod-patologias",
    },
    {
      key: "riesgo",
      api: () => window.ECICEP?.riesgo,
      slotId: "slot-riesgo",
      idRoot: "mod-riesgo",
    },
    {
      key: "alertas",
      api: () => window.ECICEP?.alertas,
      slotId: "slot-alertas",
      idRoot: "mod-alertas",
    },
  ];

  function $(sel, ctx = document) {
    return ctx.querySelector(sel);
  }
  function addHidden(form, name, value) {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value ?? "";
  }

  async function mountAll() {
    const tasks = modules.map(async (m) => {
      const slot = document.getElementById(m.slotId);
      const api = m.api?.();
      if (!slot || !api?.mount) {
        console.warn(`[orq] módulo ${m.key} no disponible o slot inexistente`);
        return { key: m.key, ok: false, reason: "slot/api" };
      }
      await api.mount(slot, { idRoot: m.idRoot });
      return { key: m.key, ok: true };
    });

    const results = await Promise.allSettled(tasks);
    results.forEach((r) => {
      if (r.status === "rejected" || (r.value && r.value.ok === false)) {
        console.warn("[orq] fallo al montar módulo:", r);
      }
    });
  }

  function wireSubmit() {
    // Ajusta el selector si tu <form> tiene id específico
    const form = $("form");
    if (!form) {
      console.warn("[orq] No se encontró <form> principal");
      return;
    }

    form.addEventListener("submit", (e) => {
      // 1) Validar módulos
      for (const m of modules) {
        const api = m.api?.();
        if (!api?.validate) continue;
        const rep = api.validate();
        if (!rep?.ok) {
          e.preventDefault();
          // Puedes enfocar el idRoot del módulo con error
          const focusNode = document.getElementById(m.idRoot);
          focusNode?.scrollIntoView({ behavior: "smooth", block: "center" });
          alert(`Corrige el módulo: ${m.key}`);
          return;
        }
      }

      // 2) Consolidar valores que no estén ya como inputs visibles
      const merged = modules.reduce((acc, m) => {
        const out = m.api?.()?.getValues?.() || {};
        return Object.assign(acc, out);
      }, {});

      // Riesgo: aseguramos campos ocultos (si tu partial ya los trae, esto solo actualiza valores)
      if ("riesgo_cv" in merged) addHidden(form, "riesgo_cv", merged.riesgo_cv);
      if ("riesgo_cv_clasificacion" in merged)
        addHidden(
          form,
          "riesgo_cv_clasificacion",
          merged.riesgo_cv_clasificacion,
        );

      // Patologías: normalmente ya vienen como checkboxes name="patologias[]", no hace falta tocar.
      // Si en algún flujo alternativo quieres enviar JSON además:
      // if (merged.patologias) addHidden(form, 'patologias_json', JSON.stringify(merged.patologias));

      // 3) Diagnóstico mínimo opcional (RUN desaparecido, etc.)
      const runEl = $('[name="run"]') || $('[name="usuario_id"]');
      if (!runEl || !runEl.value) {
        // No bloqueamos envío, solo log para depurar intermitencias
        console.debug(
          "[orq] RUN/usuario_id no visible en el DOM al enviar (verificar render/IDs).",
        );
      }
    });
  }

  // === Boot ===
  document.addEventListener("DOMContentLoaded", async () => {
    await mountAll();
    wireSubmit();
  });
})();

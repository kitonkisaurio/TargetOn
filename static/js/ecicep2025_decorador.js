// Decorador de armonización (no invasivo)
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("ec-2025");
  document.querySelectorAll("fieldset, .card").forEach((sec) => {
    sec.classList.add("ec-section");
    if (!sec.querySelector(".ec-form-grid")) sec.classList.add("ec-form-grid");
  });
  const widthMap = [
    { sel: 'input[name="run"]', cls: "w-run" },
    {
      sel: 'input[name="fecha"], input[name="fecha_ingreso"], input[name="fecha_nacimiento"], input[id*="Fecha"]',
      cls: "w-fecha",
    },
    { sel: 'input[name="telefono"]', cls: "w-telefono" },
    { sel: 'input[name="peso"]', cls: "w-peso" },
    { sel: 'input[name="talla"]', cls: "w-talla" },
    { sel: 'input[name="hba1c"], input[name="hgt"]', cls: "w-hba1c" },
    {
      sel: 'input[name="presion_sistolica"], input[name="presion_diastolica"]',
      cls: "w-presion",
    },
    { sel: 'select[name="sexo"]', cls: "w-num-md" },
    { sel: 'select[name="categoria_id"]', cls: "w-num-sm" },
    {
      sel: 'select[name="sector_id"], select[name="profesional"]',
      cls: "w-num-md",
    },
  ];
  widthMap.forEach(({ sel, cls }) =>
    document.querySelectorAll(sel).forEach((el) => el.classList.add(cls)),
  );
  const placeholders = [
    { sel: 'input[name="peso"]', text: "Peso ej: 100.1" },
    { sel: 'input[name="talla"]', text: "Talla ej: 1.50" },
    { sel: 'input[name="hba1c"]', text: "HbA1c ej: 7.2" },
    { sel: 'input[name="presion_sistolica"]', text: "PAS ej: 130" },
    { sel: 'input[name="presion_diastolica"]', text: "PAD ej: 80" },
    { sel: 'input[name="fecha_nacimiento"]', text: "AAAA-MM-DD" },
    {
      sel: 'input[name="fecha_ingreso"], input[name="fecha"]',
      text: "AAAA-MM-DD",
    },
    { sel: 'input[name="telefono"]', text: "9XXXXXXXX" },
  ];
  placeholders.forEach(({ sel, text }) =>
    document.querySelectorAll(sel).forEach((el) => {
      if (!el.placeholder) el.placeholder = text;
    }),
  );
  const setAttrs = (selector, attrs) =>
    document.querySelectorAll(selector).forEach((el) => {
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    });
  setAttrs('input[name="peso"]', { inputmode: "decimal", step: "0.1" });
  setAttrs('input[name="talla"]', { inputmode: "decimal", step: "0.01" });
  setAttrs('input[name="hba1c"], input[name="hgt"]', {
    inputmode: "decimal",
    step: "0.1",
  });
  setAttrs(
    'input[name="presion_sistolica"], input[name="presion_diastolica"]',
    { inputmode: "numeric", step: "1" },
  );
  // Normalización de fechas y ajustes de botón se gestionan ahora en scripts especializados externos
});

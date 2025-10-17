// Helpers comunes reutilizables
// Nota: mantener sin dependencias del DOM específico para poder importarlo en múltiples plantillas.

// Valida RUN chileno con dígito verificador, aceptando K/k y formatos con puntos/guión.
function validarRUN(run) {
  if (!run) return false;
  const clean = ("" + run).replace(/\./g, "").replace(/\s+/g, "").toUpperCase();
  const m = clean.match(/^([0-9]{1,8})-([0-9K])$/);
  if (!m) return false;
  const cuerpo = m[1];
  const dv = m[2];
  let suma = 0,
    mul = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (suma % 11);
  const dvCalc = res === 11 ? "0" : res === 10 ? "K" : String(res);
  return dvCalc === dv;
}

// Normaliza RUN al formato 12.345.678-9
function formatearRUN(run) {
  if (!run) return "";
  let clean = ("" + run).replace(/\./g, "").replace(/\s+/g, "").toUpperCase();
  const m = clean.match(/^([0-9]{1,8})-?([0-9K])$/);
  if (!m) return run;
  let [_, cuerpo, dv] = m; // eslint-disable-line no-unused-vars
  // Insertar puntos desde la derecha en grupos de 3
  let out = "";
  while (cuerpo.length > 3) {
    out = "." + cuerpo.slice(-3) + out;
    cuerpo = cuerpo.slice(0, -3);
  }
  out = cuerpo + out + "-" + dv;
  return out;
}

// Alias para compatibilidad con templates que usan formatRun
const formatRun = formatearRUN;
const validateRun = validarRUN;

// Helper centralizado para llamadas fetch con credenciales y manejo básico de errores JSON.
async function apiFetch(url, opts = {}) {
  const options = {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(opts.body &&
      typeof opts.body === "object" &&
      !(opts.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...opts,
  };
  if (
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData)
  ) {
    options.body = JSON.stringify(options.body);
  }
  const r = await fetch(url, options);
  const ct = r.headers.get("content-type") || "";
  let data = null;
  if (ct.includes("application/json")) {
    try {
      data = await r.json();
    } catch (_) {
      data = null;
    }
  }
  if (!r.ok) {
    const err = new Error(
      (data && (data.message || data.error)) || `HTTP ${r.status}`,
    );
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Pequeño bus de eventos para coordinación simple entre módulos UI.
const EventBus = {
  _l: {},
  on(evt, cb) {
    (this._l[evt] ||= []).push(cb);
  },
  off(evt, cb) {
    this._l[evt] = (this._l[evt] || []).filter((f) => f !== cb);
  },
  emit(evt, payload) {
    (this._l[evt] || []).forEach((f) => f(payload));
  },
};

// Formatear fecha para input datetime-local
function formatDateTimeLocal(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Formatear fecha como dd-mm-yyyy
function formatDateDMY(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// Convertir "dd/mm/yyyy" o "d/m/yyyy" a "yyyy-mm-dd" (PostgreSQL DATE)
function toPostgresDate(fechaStr) {
  if (!fechaStr) return "";
  const s = String(fechaStr).trim();
  // Si ya viene como ISO, devolver tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Aceptar separadores '/' o '-'
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!m) return s; // devolver original si no coincide (evita romper flujos)
  let [_, dd, mm, yyyy] = m; // eslint-disable-line no-unused-vars
  dd = dd.padStart(2, "0");
  mm = mm.padStart(2, "0");
  // Validación básica de rangos
  const d = parseInt(dd, 10),
    mNum = parseInt(mm, 10),
    y = parseInt(yyyy, 10);
  if (y < 1900 || y > 2100 || mNum < 1 || mNum > 12 || d < 1 || d > 31)
    return `${yyyy}-${mm}-${dd}`;
  return `${yyyy}-${mm}-${dd}`;
}

// Validar fecha no futura
function validarFechaNoFutura(fecha) {
  if (!fecha) return true;
  const fechaInput = new Date(fecha);
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999); // Permitir hasta el final del día actual
  return fechaInput <= hoy;
}

// Calcular edad desde fecha de nacimiento
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

// Debounce para optimizar llamadas de API
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Mostrar notificación toast
function showToast(message, type = "info", duration = 3000) {
  // Crear o usar contenedor existente
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "position-fixed top-0 end-0 p-3";
    container.style.zIndex = "1055";
    document.body.appendChild(container);
  }

  // Crear toast
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white bg-${type === "error" ? "danger" : type === "success" ? "success" : "primary"} border-0`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toast);

  // Mostrar toast
  const bsToast = new bootstrap.Toast(toast, { delay: duration });
  bsToast.show();

  // Limpiar después de ocultar
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

// Validación de campos comunes
const validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  telefono: (telefono) =>
    /^[+]?[\d\s\-()]{8,15}$/.test(telefono.replace(/\s/g, "")),
  numeroPositivo: (num) => !isNaN(num) && parseFloat(num) > 0,
  rangoEdad: (edad) =>
    !isNaN(edad) && parseInt(edad) >= 0 && parseInt(edad) <= 150,
};

// Exponer helpers en window para poder usarlos desde scripts inline
if (typeof window !== "undefined") {
  window.Common = {
    validarRUN,
    formatearRUN,
    formatRun,
    validateRun,
    apiFetch,
    EventBus,
    formatDateTimeLocal,
    formatDateDMY,
    toPostgresDate,
    validarFechaNoFutura,
    calcularEdad,
    debounce,
    showToast,
    validators,
  };
}

// ==========================
// Vigencia de fechas (UI)
// ==========================
// Nota: NO definimos una función global esVigente para evitar conflictos con templates
// que ya la declaran con otra firma. Usamos Common.esVigente365 y un aplicador generico.

// Retorna true si fechaStr (YYYY-MM-DD u otros formatos válidos para Date) es vigente dentro de "dias".
function esFechaVigente(fechaStr, dias = 365) {
  if (!fechaStr) return false;
  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return false;
  const hoy = new Date();
  // Normalizar a medianoche para evitar off-by-one por horas
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  const diffDias = (hoy - fecha) / (1000 * 60 * 60 * 24);
  return diffDias <= dias;
}

// Aplica color a los elementos que tengan la clase .fecha-examen (o selector custom) según vigencia
function aplicarColorVigencia(selector = ".fecha-examen", dias = 365) {
  const nodos = document.querySelectorAll(selector);
  if (!nodos || nodos.length === 0) return;
  nodos.forEach((el) => {
    const fechaStr = el.dataset.fecha || el.textContent?.trim();
    const vigente = esFechaVigente(fechaStr, dias);
    el.style.color = vigente ? "limegreen" : "red";
    if (!el.title) {
      el.title = vigente ? "Vigente" : "Vencida";
    }
  });
}

// Inicializador automático cuando el DOM está listo
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    try {
      aplicarColorVigencia(".fecha-examen", 365);
    } catch (_) {}
  });
  // Exponer en Common para uso manual tras renders dinámicos
  window.Common = window.Common || {};
  window.Common.esVigente365 = (fechaStr) => esFechaVigente(fechaStr, 365);
  window.Common.aplicarColorVigencia = aplicarColorVigencia;
}

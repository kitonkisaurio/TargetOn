/**
 * Utilidades JavaScript para convertir campos de fecha a formato español
 * Convierte automáticamente inputs type="date" a formato dd/mm/aaaa
 */

class FechaEspanol {
  constructor() {
    this.dateInputs = [];
    this.init();
  }

  // Expresiones regulares para validar formatos
  static fechaEspanolRE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  static fechaBdRE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

  /**
   * Valida si una fecha está en formato español válido (dd/mm/aaaa)
   */
  static validarFechaEspanol(fechaStr) {
    if (!fechaStr || typeof fechaStr !== "string") return false;

    const match = fechaStr.trim().match(this.fechaEspanolRE);
    if (!match) return false;

    try {
      const [, dia, mes, ano] = match;
      const fecha = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return (
        fecha.getDate() == parseInt(dia) &&
        fecha.getMonth() == parseInt(mes) - 1 &&
        fecha.getFullYear() == parseInt(ano)
      );
    } catch {
      return false;
    }
  }

  /**
   * Valida si una fecha está en formato de base de datos válido (yyyy-mm-dd)
   */
  static validarFechaBd(fechaStr) {
    if (!fechaStr || typeof fechaStr !== "string") return false;

    const match = fechaStr.trim().match(this.fechaBdRE);
    if (!match) return false;

    try {
      const [, ano, mes, dia] = match;
      const fecha = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      return (
        fecha.getDate() == parseInt(dia) &&
        fecha.getMonth() == parseInt(mes) - 1 &&
        fecha.getFullYear() == parseInt(ano)
      );
    } catch {
      return false;
    }
  }

  /**
   * Convierte fecha de formato español (dd/mm/aaaa) a formato base de datos (yyyy-mm-dd)
   */
  static espanolABd(fechaEspanol) {
    if (!this.validarFechaEspanol(fechaEspanol)) return null;

    const match = fechaEspanol.trim().match(this.fechaEspanolRE);
    const [, dia, mes, ano] = match;

    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  /**
   * Convierte fecha de formato base de datos (yyyy-mm-dd) a formato español (dd/mm/aaaa)
   */
  static bdAEspanol(fechaBd) {
    if (!this.validarFechaBd(fechaBd)) return null;

    const match = fechaBd.trim().match(this.fechaBdRE);
    const [, ano, mes, dia] = match;

    return `${parseInt(dia)}/${parseInt(mes)}/${ano}`;
  }

  /**
   * Detecta automáticamente el formato de fecha y convierte al otro formato
   */
  static convertirFechaAutomatica(fechaStr) {
    if (!fechaStr) return null;

    if (this.validarFechaEspanol(fechaStr)) {
      return this.espanolABd(fechaStr);
    } else if (this.validarFechaBd(fechaStr)) {
      return this.bdAEspanol(fechaStr);
    }
    return null;
  }

  /**
   * Inicializa la españolización automática de todos los campos de fecha
   */
  init() {
    // Esperar que el DOM esté listo
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.spanishDateInputs(),
      );
    } else {
      this.spanishDateInputs();
    }
  }

  /**
   * Convierte todos los inputs type="date" a formato español
   */
  spanishDateInputs() {
    // Buscar todos los inputs tipo date
    const dateInputs = document.querySelectorAll('input[type="date"]');

    dateInputs.forEach((input) => this.convertirInputAEspanol(input));

    console.log(
      `🇪🇸 [FechaEspanol] Convertidos ${dateInputs.length} campos de fecha a formato español`,
    );
  }

  /**
   * Convierte un input específico de date a formato español
   */
  convertirInputAEspanol(originalInput) {
    // Crear el input visual en formato español
    const spanishInput = document.createElement("input");
    spanishInput.type = "text";
    spanishInput.id = originalInput.id + "_display";
    spanishInput.name = originalInput.name + "_display";
    spanishInput.placeholder = "dd/mm/aaaa";
    spanishInput.inputMode = "numeric";
    spanishInput.autocomplete = "off";

    // Copiar atributos y estilos del input original
    this.copiarAtributos(originalInput, spanishInput);

    // Configurar el input original como hidden
    originalInput.type = "hidden";
    originalInput.id = originalInput.id || originalInput.name;

    // Insertar el input español antes del original
    originalInput.parentNode.insertBefore(spanishInput, originalInput);

    // Configurar eventos de sincronización
    this.configurarSincronizacion(spanishInput, originalInput);

    // Inicializar valores si existen
    this.inicializarValores(spanishInput, originalInput);

    // Guardar referencia
    this.dateInputs.push({
      spanish: spanishInput,
      original: originalInput,
    });
  }

  /**
   * Copia atributos relevantes del input original al español
   */
  copiarAtributos(original, spanish) {
    const atributosCopiar = [
      "required",
      "disabled",
      "readonly",
      "class",
      "style",
    ];

    atributosCopiar.forEach((attr) => {
      if (original.hasAttribute(attr)) {
        spanish.setAttribute(attr, original.getAttribute(attr));
      }
    });

    // Copiar event handlers específicos
    ["onchange", "oninput", "onblur", "onfocus"].forEach((event) => {
      if (original[event]) {
        spanish[event] = original[event];
      }
    });
  }

  /**
   * Configura la sincronización bidireccional entre inputs
   */
  configurarSincronizacion(spanishInput, originalInput) {
    // Formateo automático mientras escribe
    spanishInput.addEventListener("input", (e) => {
      let valor = e.target.value.replace(/\D/g, ""); // Solo números

      // Formatear automáticamente mientras escribe
      if (valor.length >= 2) {
        valor = valor.substring(0, 2) + "/" + valor.substring(2);
      }
      if (valor.length >= 5) {
        valor = valor.substring(0, 5) + "/" + valor.substring(5, 9);
      }

      // Limitar a 10 caracteres (dd/mm/aaaa)
      if (valor.length > 10) {
        valor = valor.substring(0, 10);
      }

      // Actualizar solo si cambió
      if (e.target.value !== valor) {
        e.target.value = valor;
      }

      // Sincronizar con input original si la fecha está completa
      if (valor.length === 10) {
        const fechaBd = FechaEspanol.espanolABd(valor);
        if (fechaBd) {
          originalInput.value = fechaBd;
        } else {
          originalInput.value = "";
        }
      } else {
        originalInput.value = "";
      }
    });

    // Validación final al perder foco
    spanishInput.addEventListener("blur", (e) => {
      const valor = e.target.value;
      if (valor && !FechaEspanol.validarFechaEspanol(valor)) {
        // Mostrar error visual
        e.target.style.borderColor = "#dc3545";
        e.target.title = "Formato de fecha inválido. Use dd/mm/aaaa";
      } else {
        // Remover error visual
        e.target.style.borderColor = "";
        e.target.title = "";
      }
    });

    // Actualizar input español cuando cambie el original
    originalInput.addEventListener("change", () => {
      if (originalInput.value) {
        const fechaEspanol = FechaEspanol.bdAEspanol(originalInput.value);
        if (fechaEspanol) {
          spanishInput.value = fechaEspanol;
        }
      }
    });
  }

  /**
   * Inicializa valores existentes
   */
  inicializarValores(spanishInput, originalInput) {
    // Si el input original ya tiene valor, convertirlo
    if (originalInput.value) {
      const fechaEspanol = FechaEspanol.bdAEspanol(originalInput.value);
      if (fechaEspanol) {
        spanishInput.value = fechaEspanol;
      }
    }
  }

  /**
   * Obtiene el valor en formato BD de un campo españolizado
   */
  static obtenerValorBd(inputId) {
    const spanishInput = document.getElementById(inputId + "_display");
    const originalInput = document.getElementById(inputId);

    if (spanishInput && spanishInput.value) {
      return FechaEspanol.espanolABd(spanishInput.value);
    } else if (originalInput) {
      return originalInput.value;
    }

    return null;
  }

  /**
   * Establece el valor de un campo españolizado
   */
  static establecerValor(inputId, valor, formato = "auto") {
    const spanishInput = document.getElementById(inputId + "_display");
    const originalInput = document.getElementById(inputId);

    if (!spanishInput || !originalInput) return false;

    let valorEspanol, valorBd;

    if (formato === "auto") {
      if (FechaEspanol.validarFechaEspanol(valor)) {
        valorEspanol = valor;
        valorBd = FechaEspanol.espanolABd(valor);
      } else if (FechaEspanol.validarFechaBd(valor)) {
        valorBd = valor;
        valorEspanol = FechaEspanol.bdAEspanol(valor);
      }
    } else if (formato === "espanol") {
      valorEspanol = valor;
      valorBd = FechaEspanol.espanolABd(valor);
    } else if (formato === "bd") {
      valorBd = valor;
      valorEspanol = FechaEspanol.bdAEspanol(valor);
    }

    if (valorEspanol && valorBd) {
      spanishInput.value = valorEspanol;
      originalInput.value = valorBd;
      return true;
    }

    return false;
  }

  /**
   * Valida todos los campos de fecha españolizados en un formulario
   */
  static validarFormulario(formulario) {
    const errores = [];
    const inputs = formulario.querySelectorAll('input[name$="_display"]');

    inputs.forEach((input) => {
      if (input.value && !FechaEspanol.validarFechaEspanol(input.value)) {
        errores.push({
          campo: input.name.replace("_display", ""),
          valor: input.value,
          mensaje: "Formato de fecha inválido. Use dd/mm/aaaa",
        });
      }
    });

    return errores;
  }
}

// Inicializar automáticamente
const fechaEspanol = new FechaEspanol();

// Exponer en window para uso global
window.FechaEspanol = FechaEspanol;

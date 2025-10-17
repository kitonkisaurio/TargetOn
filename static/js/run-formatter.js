/**
 * ECICEP - Formateo Universal de RUN
 *
 * Script que aplica formateo automático de RUN (12.345.678-9)
 * a todos los inputs con name/id que contengan 'run'
 *
 * Funcionalidades:
 * - Formateo automático mientras se escribe
 * - Validación visual (verde válido, rojo inválido)
 * - Compatible con formato existente en BD (10.000.141-1)
 */

(function () {
  "use strict";

  // Importar funciones de common.js si está disponible
  const formatearRUN =
    window.Common?.formatearRUN ||
    function (run) {
      if (!run) return "";

      // Limpiar el RUN: solo números y K, convertir a mayúscula
      let clean = ("" + run).replace(/[^0-9kK]/g, "").toUpperCase();

      // Debe tener al menos 2 caracteres (cuerpo + DV)
      if (clean.length < 2) return run;

      // Separar cuerpo y dígito verificador
      const cuerpo = clean.slice(0, -1);
      const dv = clean.slice(-1);

      // Validar que el cuerpo sean solo números
      if (!/^\d+$/.test(cuerpo)) return run;

      // Validar que el DV sea válido
      if (!/^[0-9K]$/.test(dv)) return run;

      // Formatear con puntos desde la derecha en grupos de 3
      let formattedCuerpo = "";
      let temp = cuerpo;

      while (temp.length > 3) {
        formattedCuerpo = "." + temp.slice(-3) + formattedCuerpo;
        temp = temp.slice(0, -3);
      }
      formattedCuerpo = temp + formattedCuerpo;

      return formattedCuerpo + "-" + dv;
    };

  const validarRUN =
    window.Common?.validarRUN ||
    function (run) {
      if (!run) return false;

      // Limpiar el RUN: solo números y K
      const clean = ("" + run).replace(/[^0-9kK]/g, "").toUpperCase();

      // Debe tener entre 2 y 9 caracteres (mínimo 1 dígito cuerpo + 1 DV)
      if (clean.length < 2 || clean.length > 9) return false;

      // Separar cuerpo y dígito verificador
      const cuerpo = clean.slice(0, -1);
      const dv = clean.slice(-1);

      // Validar que el cuerpo sean solo números
      if (!/^\d+$/.test(cuerpo)) return false;

      // Validar que el DV sea válido
      if (!/^[0-9K]$/.test(dv)) return false;

      // Calcular dígito verificador
      let suma = 0;
      let mul = 2;
      for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i], 10) * mul;
        mul = mul === 7 ? 2 : mul + 1;
      }
      const res = 11 - (suma % 11);
      const dvCalc = res === 11 ? "0" : res === 10 ? "K" : String(res);

      return dvCalc === dv;
    };

  // Función para aplicar formateo a un input específico
  function aplicarFormateoRUN(input) {
    if (input.dataset.runFormatterApplied) return;
    input.dataset.runFormatterApplied = "true";

    // Aplicar estilos CSS para validación visual
    if (!document.getElementById("run-formatter-styles")) {
      const style = document.createElement("style");
      style.id = "run-formatter-styles";
      style.textContent = `
                .run-valid { 
                    color: #16a34a !important; 
                    border-color: #16a34a !important; 
                }
                .run-invalid { 
                    color: #dc2626 !important; 
                    border-color: #dc2626 !important; 
                }
                .run-neutral {
                    color: #374151 !important;
                    border-color: #d1d5db !important;
                }
            `;
      document.head.appendChild(style);
    }

    // Evento para formatear mientras escribe
    input.addEventListener("input", function (e) {
      const cursorPos = e.target.selectionStart;
      const originalValue = e.target.value;
      const formattedValue = formatearRUN(originalValue);

      if (formattedValue !== originalValue) {
        e.target.value = formattedValue;
        // Mantener cursor en posición apropiada
        const newPos = Math.min(
          cursorPos + (formattedValue.length - originalValue.length),
          formattedValue.length,
        );
        e.target.setSelectionRange(newPos, newPos);
      }

      // Aplicar validación visual
      aplicarValidacionVisual(e.target);
    });

    // Evento para formatear al perder el foco
    input.addEventListener("blur", function (e) {
      const formatted = formatearRUN(e.target.value);
      e.target.value = formatted;
      aplicarValidacionVisual(e.target);
    });

    // Formatear valor inicial si existe
    if (input.value) {
      input.value = formatearRUN(input.value);
      aplicarValidacionVisual(input);
    }
  }

  // Función para aplicar validación visual
  function aplicarValidacionVisual(input) {
    const value = input.value.trim();

    // Remover clases previas
    input.classList.remove("run-valid", "run-invalid", "run-neutral");

    if (!value) {
      input.classList.add("run-neutral");
      return;
    }

    if (validarRUN(value)) {
      input.classList.add("run-valid");
      input.title = "RUN válido";
    } else {
      input.classList.add("run-invalid");
      input.title = "RUN inválido - verifique el formato";
    }
  }

  // Función para buscar y aplicar formateo a todos los inputs de RUN
  function inicializarFormateadorRUN() {
    // Buscar todos los inputs que puedan contener RUN
    const selectors = [
      'input[name*="run"]',
      'input[id*="run"]',
      'input[name*="rut"]',
      'input[id*="rut"]',
      'input[name*="cedula"]',
      'input[id*="cedula"]',
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((input) => {
        // Solo aplicar a inputs de texto
        if (input.type === "text" || input.type === "") {
          aplicarFormateoRUN(input);
        }
      });
    });
  }

  // Función para obtener RUN sin formato (solo números y K)
  function obtenerRUNLimpio(run) {
    return (run || "").replace(/[^0-9kK]/gi, "").toUpperCase();
  }

  // Función para obtener RUN formateado (con puntos y guión)
  function obtenerRUNFormateado(run) {
    return formatearRUN(run);
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarFormateadorRUN);
  } else {
    inicializarFormateadorRUN();
  }

  // También observar cambios en el DOM para inputs dinámicos
  if (window.MutationObserver) {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            // Element node
            if (
              node.matches &&
              node.matches(
                'input[name*="run"], input[id*="run"], input[name*="rut"], input[id*="rut"]',
              )
            ) {
              aplicarFormateoRUN(node);
            } else if (node.querySelectorAll) {
              node
                .querySelectorAll(
                  'input[name*="run"], input[id*="run"], input[name*="rut"], input[id*="rut"]',
                )
                .forEach(aplicarFormateoRUN);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Exponer funciones útiles globalmente
  window.EciceRUNFormatter = {
    formatear: formatearRUN,
    validar: validarRUN,
    obtenerLimpio: obtenerRUNLimpio,
    obtenerFormateado: obtenerRUNFormateado,
    aplicarA: aplicarFormateoRUN,
    inicializar: inicializarFormateadorRUN,
  };
})();

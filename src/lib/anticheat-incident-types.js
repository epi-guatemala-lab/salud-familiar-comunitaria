// src/lib/anticheat-incident-types.js
//
// Whitelist de tipos de incidente válidos. Debe coincidir con la tabla
// de pesos del backend (doc 02 §C / §D — tabla de pesos). El backend
// es la autoridad final, pero mantener este enum sincronizado evita
// typos cliente-side y permite mostrar mensajes amigables al usuario.

export const INCIDENTE_TIPOS = Object.freeze({
  // ---- Visibilidad / foco ----
  BLUR: { severidad: 'BAJA', label: 'Pérdida de foco', upgradeAlta: 30000 /* >30s ms */ },
  VISIBILITY_HIDDEN: { severidad: 'MEDIA', label: 'Pestaña oculta' },
  FULLSCREEN_EXIT: { severidad: 'MEDIA', label: 'Saliste de pantalla completa' },
  FULLSCREEN_FAIL: { severidad: 'BAJA', label: 'Pantalla completa no disponible' },

  // ---- Copy / paste / context ----
  COPY_ATTEMPT: { severidad: 'ALTA', label: 'Intento de copiar' },
  CUT_ATTEMPT: { severidad: 'ALTA', label: 'Intento de cortar' },
  PASTE_ATTEMPT: { severidad: 'ALTA', label: 'Intento de pegar' },
  CONTEXTMENU: { severidad: 'BAJA', label: 'Menú contextual' },

  // ---- Teclas ----
  FORBIDDEN_KEY: { severidad: 'ALTA', label: 'Tecla bloqueada' },

  // ---- DevTools / autofill ----
  DEVTOOLS_DETECTED: { severidad: 'CRITICA', label: 'Herramientas de desarrollador detectadas' },
  AUTOFILL_DETECTED: { severidad: 'ALTA', label: 'Autocompletado detectado' },

  // ---- Tecleo / patrones ----
  PASTE_LIKE: { severidad: 'ALTA', label: 'Inserción masiva detectada' },
  TYPE_TOO_FAST: { severidad: 'MEDIA', label: 'Velocidad de tecleo anormal' },
  RAPID_ANSWER: { severidad: 'MEDIA', label: 'Respuesta demasiado rápida' },
  ANSWER_CHANGE_EXCESSIVE: { severidad: 'BAJA', label: 'Demasiados cambios en una respuesta' },

  // ---- Plagio (servidor lo registra) ----
  PLAGIO_DETECTADO: { severidad: 'ALTA', label: 'Plagio detectado' },

  // ---- Sesión / red ----
  CSRF_INVALID: { severidad: 'ALTA', label: 'Token CSRF inválido' },
  UA_CHANGE: { severidad: 'CRITICA', label: 'Cambio de navegador' },
  IP_CHANGE: { severidad: 'MEDIA', label: 'Cambio de red' },
  FINGERPRINT_DRIFT: { severidad: 'CRITICA', label: 'Cambio de dispositivo' },
  DOUBLE_LOGIN: { severidad: 'CRITICA', label: 'Login duplicado' },
  MULTI_TAB_DETECTED: { severidad: 'ALTA', label: 'Múltiples pestañas detectadas' },
  HEADLESS_DETECTED: { severidad: 'CRITICA', label: 'Navegador sin interfaz detectado' },
  HEARTBEAT_LOST: { severidad: 'MEDIA', label: 'Conexión inestable' },
  RESUMED_AFTER_DISCONNECT: { severidad: 'BAJA', label: 'Reconexión tras desconexión' },

  // ---- Tiempo / sistema ----
  TIME_EXCEEDED: { severidad: 'ALTA', label: 'Tiempo agotado' },
  AUTO_SUBMIT_BY_STRIKES: { severidad: 'CRITICA', label: 'Envío automático por strikes' },
  AUTO_SUBMIT_BY_CRITICAL_SCORE: { severidad: 'CRITICA', label: 'Envío automático por score crítico' },

  // ---- PoW ----
  POW_FAIL: { severidad: 'BAJA', label: 'Proof-of-work inválido' },
});

/**
 * Devuelve un mensaje legible para el usuario para un tipo de
 * incidente. Si el tipo es desconocido, devuelve el código tal cual.
 */
export function describeIncidente(tipo) {
  return INCIDENTE_TIPOS[tipo]?.label || tipo;
}

/**
 * Severidad por defecto para un tipo. Devuelve 'MEDIA' si no se
 * encuentra (conservador).
 */
export function severidadPorDefecto(tipo) {
  return INCIDENTE_TIPOS[tipo]?.severidad || 'MEDIA';
}

/**
 * Conjunto de severidades válidas (debe coincidir con el backend).
 */
export const SEVERIDADES = Object.freeze(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']);

export function esTipoValido(tipo) {
  return Object.prototype.hasOwnProperty.call(INCIDENTE_TIPOS, tipo);
}

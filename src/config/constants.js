// Constantes globales SFyC.

export const ROLES = {
  ADMIN: 'admin',
  DOCENTE: 'docente',
  ESTUDIANTE: 'estudiante',
  PERSONAL: 'personal',
};

export const BITACORA_ROLES = {
  ASISTENTE: 'bitacora.asistente',
  DIRECTOR: 'bitacora.director',
  SECRETARIA: 'bitacora.secretaria',
};

export const TIPO_PREGUNTA = {
  MCQ: 'MCQ',
  MULTIPLE: 'MULTIPLE',
  VF: 'VF',
  ABIERTA: 'ABIERTA',
};

export const ESCALA_TIPO = {
  LIKERT_1_4: 'LIKERT_1_4',
  SEMAFORO_2_3_4: 'SEMAFORO_2_3_4',
};

export const STORAGE_KEYS = {
  TOKEN: 'sfyc_token', // pragma: allowlist secret — nombre de clave, no credencial
  USER: 'sfyc_user',
  OFFLINE_QUEUE: 'sfyc_offline_queue',
  ENCUESTA_DRAFT: 'sfyc_encuesta_draft',
  ENCUESTA_UUID: 'sfyc_encuesta_uuid',
  UNIDADES_CACHE: 'sfyc_unidades_cache_v1',
};

// Eventos custom para coordinar logout / auth-invalidation entre listeners.
export const EVENTS = {
  AUTH_INVALIDATED: 'sfyc:auth:invalidated',
  BITACORA_NOTIFICATIONS_CHANGED: 'sfyc:bitacora:notifications-changed',
  TOAST: 'sfyc:toast',
};

export const RUBRICAS_DISPONIBLES = ['GENERICA', 'GYO', 'PEDIATRIA'];

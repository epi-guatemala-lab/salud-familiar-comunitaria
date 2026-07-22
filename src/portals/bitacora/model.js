export const GT_TIME_ZONE = 'America/Guatemala';
export const UNSAVED_CHANGES_MESSAGE = 'Tiene cambios sin guardar. ¿Desea continuar sin guardarlos?';

export const PROGRAM_STATUS = {
  BORRADOR: 'BORRADOR',
  PROGRAMADA: 'PROGRAMADA',
  REALIZADA: 'REALIZADA',
  NO_REALIZADA: 'NO_REALIZADA',
  CANCELADA: 'CANCELADA',
};

export const DOCUMENT_STATUS = {
  NO_INICIADA: 'NO_INICIADA',
  BORRADOR: 'BORRADOR',
  ENVIADA: 'ENVIADA',
  REQUIERE_CORRECCION: 'REQUIERE_CORRECCION',
  COMPLETA: 'COMPLETA',
};

export const PROGRAM_STATUS_META = {
  BORRADOR: { label: 'Borrador', tone: 'default' },
  PROGRAMADA: { label: 'Programada', tone: 'blue' },
  REALIZADA: { label: 'Realizada', tone: 'green' },
  NO_REALIZADA: { label: 'No realizada', tone: 'yellow' },
  CANCELADA: { label: 'Cancelada', tone: 'red' },
};

export const DOCUMENT_STATUS_META = {
  NO_INICIADA: { label: 'Documentación no iniciada', tone: 'default' },
  BORRADOR: { label: 'Documentación en borrador', tone: 'blue' },
  ENVIADA: { label: 'En revisión documental', tone: 'yellow' },
  REQUIERE_CORRECCION: { label: 'Requiere corrección', tone: 'red' },
  COMPLETA: { label: 'Documentación completa', tone: 'green' },
};

export const ACTIVITY_TYPES = [
  'Reunión',
  'Taller',
  'Capacitación',
  'Supervisión',
  'Visita de campo',
  'Jornada',
  'Coordinación',
  'Otra',
];

export const MODALITIES = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HIBRIDA', label: 'Híbrida' },
];
export const PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

export const DATE_PRECISION_LABELS = {
  EXACTA: 'Fecha exacta',
  MES: 'Precisión mensual',
  ANIO: 'Precisión anual',
  RANGO: 'Rango textual',
  MULTIPLE: 'Múltiples fechas',
  APROXIMADA: 'Fecha aproximada',
  SIN_FECHA: 'Sin fecha',
};

export const REPORT_FIELDS = [
  ['actor_involucrado', 'Actor o actores involucrados'],
  ['que_ocurrio', 'Qué ocurrió'],
  ['evidencia_disponible', 'Evidencia textual disponible'],
  ['dificultades', 'Dificultades encontradas'],
  ['solucion', 'Solución implementada'],
  ['aprendizaje', 'Aprendizaje obtenido'],
];

export function normalizePaginated(payload, defaults = {}) {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length, page: 1, limit: payload.length || 20 };
  }
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    items,
    total: Number(payload?.total ?? items.length),
    page: Number(payload?.page ?? defaults.page ?? 1),
    limit: Number(payload?.limit ?? defaults.limit ?? 20),
  };
}

export function activityId(activity) {
  return activity?.id ?? activity?.actividad_id;
}

export function activityStart(activity) {
  return activity?.inicio_at || activity?.inicio_utc || activity?.fecha_inicio || activity?.inicio || null;
}

export function activityEnd(activity) {
  return activity?.fin_at || activity?.fin_utc || activity?.fecha_fin || activity?.fin || null;
}

export function activityTitle(activity) {
  return activity?.titulo || activity?.nombre || 'Actividad sin título';
}

export function initialDraft() {
  return {
    titulo: '',
    objetivo: '',
    tipo: '',
    tipo_valor_id: '',
    unidad_lugar: '',
    modalidad: '',
    inicio_at: '',
    fin_at: '',
    organizador: '',
    motivo: '',
    prioridad: 'MEDIA',
    clasificacion_id: '',
    etiquetas: [],
    campos_personalizados: {},
    recurrencia: {
      enabled: false,
      frecuencia: 'WEEKLY',
      intervalo: 1,
      fin_tipo: 'fecha',
      hasta: '',
      conteo: 10,
      rrule: '',
    },
    participantes: [{ nombre: '', funcion: '', usuario_id: '', convocado: true, asistio: null }],
    informe: Object.fromEntries(REPORT_FIELDS.map(([field]) => [field, ''])),
    acuerdos: [initialAgreement()],
    evidencias: [],
    version: null,
    estado_programacion: PROGRAM_STATUS.BORRADOR,
    estado_documentacion: DOCUMENT_STATUS.NO_INICIADA,
    ultima_devolucion: null,
    legacy_import: false,
  };
}

export function initialAgreement() {
  return {
    client_key:
      globalThis.crypto?.randomUUID?.() || `agreement-${Date.now()}-${Math.random()}`,
    id: null,
    descripcion: '',
    responsables: [{ tipo: 'interno', usuario_id: '', nombre: '' }],
    vencimiento_at: '',
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
  };
}

const RRULE_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);

function rruleComponents(value = '') {
  const raw = String(value).trim().replace(/^RRULE:/i, '').toUpperCase();
  const components = {};
  raw.split(';').forEach((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return;
    const key = part.slice(0, separator).trim();
    const componentValue = part.slice(separator + 1).trim();
    if (key && componentValue && components[key] === undefined) {
      components[key] = componentValue;
    }
  });
  return { raw, components };
}

function rruleUntilDate(value) {
  const match = String(value || '').match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/
  );
  if (!match) return '';
  const [, year, month, day, hour, minute, second, utcMarker] = match;
  if (!hour || !utcMarker) return `${year}-${month}-${day}`;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  return toDateTimeInput(iso).slice(0, 10);
}

/**
 * Interpreta la forma que entrega FastAPI (`rrule` como texto RFC 5545) para
 * que los controles simplificados nunca muestren sus defaults como si fueran
 * datos reales de una serie existente. Los componentes avanzados se conservan
 * íntegros en `rrule` y también se exponen para pruebas/consumidores futuros.
 */
export function parseRRule(value) {
  const { raw, components } = rruleComponents(value);
  if (!raw) return null;
  const frequency = components.FREQ;
  if (!RRULE_FREQUENCIES.has(frequency)) return { rrule: raw, componentes: components };

  const interval = Number(components.INTERVAL || 1);
  const count = Number(components.COUNT);
  const result = {
    rrule: raw,
    componentes: components,
    frecuencia: frequency,
    intervalo: Number.isInteger(interval) && interval > 0 ? interval : 1,
  };
  if (Number.isInteger(count) && count > 0) {
    result.fin_tipo = 'conteo';
    result.conteo = count;
  } else if (components.UNTIL) {
    result.fin_tipo = 'fecha';
    result.hasta = rruleUntilDate(components.UNTIL);
  }
  if (components.BYDAY) result.byday = components.BYDAY.split(',');
  if (components.BYMONTHDAY) result.bymonthday = components.BYMONTHDAY.split(',');
  if (components.BYMONTH) result.bymonth = components.BYMONTH.split(',');
  if (components.BYSETPOS) result.bysetpos = components.BYSETPOS.split(',');
  if (components.WKST) result.wkst = components.WKST;
  return result;
}

function rruleUntilFromDate(dateValue) {
  if (!dateValue) return null;
  const instant = new Date(toUtcIso(`${dateValue}T23:59`));
  if (Number.isNaN(instant.getTime())) return null;
  const compact = instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return compact;
}

/** Conserva BYDAY/BYMONTH/... al editar los controles simples de una RRULE. */
export function rewriteRRule(value, recurrence = {}) {
  const { raw } = rruleComponents(value);
  const ordered = raw
    .split(';')
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      return separator > 0
        ? [part.slice(0, separator), part.slice(separator + 1)]
        : [part, ''];
    });
  const set = (key, nextValue) => {
    const index = ordered.findIndex(([current]) => current === key);
    if (nextValue === null || nextValue === undefined || nextValue === '') {
      if (index >= 0) ordered.splice(index, 1);
      return;
    }
    if (index >= 0) ordered[index] = [key, String(nextValue).toUpperCase()];
    else ordered.push([key, String(nextValue).toUpperCase()]);
  };

  set('FREQ', RRULE_FREQUENCIES.has(recurrence.frecuencia) ? recurrence.frecuencia : 'WEEKLY');
  set('INTERVAL', Math.max(1, Number(recurrence.intervalo) || 1));
  if (recurrence.fin_tipo === 'conteo') {
    set('UNTIL', null);
    const count = Number(recurrence.conteo);
    set('COUNT', Number.isInteger(count) && count > 0 ? count : null);
  } else {
    set('COUNT', null);
    set('UNTIL', rruleUntilFromDate(recurrence.hasta));
  }
  return ordered.map(([key, componentValue]) => `${key}=${componentValue}`).join(';');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

export function activityToDraft(activity = {}) {
  const base = initialDraft();
  const report = activity.informe || {};
  const recurrence = activity.recurrencia || activity.serie || {};
  const recurrenceRule = recurrence.rrule || activity.rrule || '';
  const parsedRule = parseRRule(recurrenceRule);
  const tagDetails = asArray(activity.etiquetas);
  return {
    ...base,
    ...activity,
    titulo: activity.titulo || '',
    objetivo: activity.objetivo || '',
    tipo: activity.tipo || '',
    tipo_valor_id: activity.tipo_valor_id || '',
    unidad_lugar: activity.unidad_lugar || activity.lugar || activity.unidad_nombre || '',
    modalidad: activity.modalidad || '',
    organizador: activity.organizador || activity.organizador_externo || '',
    ultima_devolucion: activity.ultima_devolucion ?? null,
    clasificacion_id: activity.clasificacion_id || activity.clasificacion_valor_id || '',
    etiquetas: tagDetails.map((tag) => (
      typeof tag === 'object' && tag !== null ? tag.id || tag.nombre : tag
    )).filter(Boolean),
    etiqueta_detalles: tagDetails.filter((tag) => typeof tag === 'object' && tag !== null),
    campos_personalizados: activity.campos_personalizados || {},
    inicio_at: toDateTimeInput(activityStart(activity)),
    fin_at: toDateTimeInput(activityEnd(activity)),
    recurrencia: {
      ...base.recurrencia,
      ...recurrence,
      ...(parsedRule || {}),
      enabled: Boolean(recurrence.enabled ?? recurrenceRule),
      rrule: recurrenceRule,
      frecuencia: parsedRule?.frecuencia || recurrence.frecuencia || base.recurrencia.frecuencia,
      intervalo: parsedRule?.intervalo || recurrence.intervalo || base.recurrencia.intervalo,
      hasta: parsedRule?.hasta || toDateInput(recurrence.hasta),
      conteo: parsedRule?.conteo || recurrence.conteo || base.recurrencia.conteo,
      fin_tipo: parsedRule?.fin_tipo || (recurrence.conteo ? 'conteo' : 'fecha'),
    },
    participantes:
      asArray(activity.participantes).length > 0 ? activity.participantes : base.participantes,
    informe: {
      ...base.informe,
      ...report,
    },
    acuerdos: asArray(activity.acuerdos).length > 0
      ? activity.acuerdos.map((agreement) => ({
        ...agreement,
        vencimiento_at: toDateTimeInput(agreement.vencimiento_at),
        responsables: asArray(agreement.responsables).map((responsible) => ({
          ...responsible,
          tipo: responsible.usuario_id ? 'interno' : 'externo',
        })),
      }))
      : base.acuerdos,
    evidencias: asArray(activity.evidencias),
  };
}

function hasText(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

export function programmingMissingFields(draft, customFields = []) {
  if (draft?.legacy_import) return [];
  const required = [
    ['titulo', 'Título'],
    ['objetivo', 'Objetivo'],
    ['tipo', 'Tipo de actividad'],
    ['unidad_lugar', 'Unidad o lugar'],
    ['modalidad', 'Modalidad'],
    ['inicio_at', 'Fecha y hora de inicio'],
    ['fin_at', 'Fecha y hora de finalización'],
    ['organizador', 'Organizador'],
  ];
  const missing = required.filter(([field]) => !hasText(draft?.[field])).map(([, label]) => label);
  const participants = asArray(draft?.participantes).filter((p) => hasText(p.nombre) || p.usuario_id);
  if (participants.length === 0) missing.push('Al menos un participante');
  if (draft?.inicio_at && draft?.fin_at && draft.fin_at <= draft.inicio_at) {
    missing.push('La finalización debe ser posterior al inicio');
  }
  if (draft?.recurrencia?.enabled && !buildRRule(draft.recurrencia)) {
    missing.push('Configuración de recurrencia válida');
  }
  customFields.filter((field) => field.requerido).forEach((field) => {
    const value = draft?.campos_personalizados?.[field.clave];
    if (value === null || value === undefined || value === '') {
      missing.push(`Campo requerido: ${field.nombre}`);
    }
  });
  return missing;
}

export function documentationMissingFields(draft) {
  if (draft?.legacy_import) return [];
  const missing = [];
  REPORT_FIELDS.forEach(([field, label]) => {
    if (!hasText(draft?.informe?.[field])) missing.push(label);
  });
  const participants = asArray(draft?.participantes).filter((p) => hasText(p.nombre) || p.usuario_id);
  if (participants.length === 0 || participants.some((p) => p.asistio === null || p.asistio === undefined)) {
    missing.push('Asistencia real de participantes');
  }
  const validAgreement = asArray(draft?.acuerdos).some(
    (agreement) =>
      hasText(agreement.descripcion)
      && hasText(agreement.vencimiento_at)
      && asArray(agreement.responsables).some((r) => hasText(r.nombre) || r.usuario_id)
  );
  if (!validAgreement) missing.push('Al menos un acuerdo completo');
  return missing;
}

export function allMissingFields(draft, customFields = []) {
  const backend = Array.isArray(draft?.missing_fields) ? draft.missing_fields : [];
  return [...new Set([
    ...backend,
    ...programmingMissingFields(draft, customFields),
    ...documentationMissingFields(draft),
  ])];
}

export function buildRRule(recurrence = {}) {
  if (!recurrence.enabled) return null;
  if (recurrence.rrule?.trim()) {
    const parsed = parseRRule(recurrence.rrule);
    if (!parsed?.frecuencia) return null;
    const count = parsed.componentes?.COUNT;
    const until = parsed.componentes?.UNTIL;
    if (!(count && /^\d+$/.test(count) && Number(count) > 0) && !until) return null;
    return parsed.rrule;
  }
  const frequency = recurrence.frecuencia;
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(frequency)) return null;
  const parts = [`FREQ=${frequency}`, `INTERVAL=${Math.max(1, Number(recurrence.intervalo) || 1)}`];
  if (recurrence.fin_tipo === 'fecha') {
    if (!recurrence.hasta) return null;
    parts.push(`UNTIL=${recurrence.hasta.replaceAll('-', '')}T235959Z`);
  } else if (recurrence.fin_tipo === 'conteo') {
    const count = Number(recurrence.conteo);
    if (!Number.isInteger(count) || count < 2) return null;
    parts.push(`COUNT=${count}`);
  }
  return parts.join(';');
}

export function toUtcIso(localValue) {
  if (!localValue) return null;
  if (/Z$|[+-]\d\d:\d\d$/.test(localValue)) return new Date(localValue).toISOString();
  // Guatemala no aplica horario de verano; datetime-local se interpreta explícitamente en UTC-6.
  return new Date(`${localValue}:00-06:00`).toISOString();
}

export function dateBoundaryUtc(dateValue, endOfDay = false) {
  if (!dateValue) return null;
  const time = endOfDay ? '23:59:59' : '00:00:00';
  return new Date(`${dateValue}T${time}-06:00`).toISOString().replace('.000Z', 'Z');
}

export function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: GT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function toDateInput(value) {
  return value ? toDateTimeInput(value).slice(0, 10) : '';
}

export function serializeActivity(draft) {
  const recurrence = draft.recurrencia?.enabled
    ? {
      enabled: true,
      rrule: draft.recurrencia.rrule?.trim() || null,
      frecuencia: draft.recurrencia.rrule?.trim() ? null : draft.recurrencia.frecuencia,
      intervalo: Number(draft.recurrencia.intervalo) || 1,
      hasta:
        !draft.recurrencia.rrule?.trim()
          && draft.recurrencia.fin_tipo === 'fecha'
          && draft.recurrencia.hasta
          ? toUtcIso(`${draft.recurrencia.hasta}T23:59`)
          : null,
      conteo:
        !draft.recurrencia.rrule?.trim() && draft.recurrencia.fin_tipo === 'conteo'
          ? Number(draft.recurrencia.conteo)
          : null,
    }
    : null;
  return {
    titulo: (draft.titulo || '').trim(),
    objetivo: (draft.objetivo || '').trim(),
    tipo: draft.tipo,
    tipo_valor_id: draft.tipo_valor_id ? Number(draft.tipo_valor_id) : null,
    unidad_lugar: (draft.unidad_lugar || '').trim(),
    unidad_codigo: draft.unidad_codigo || null,
    unidad_nombre: draft.unidad_nombre?.trim() || (draft.unidad_lugar || '').trim(),
    lugar: (draft.unidad_lugar || '').trim(),
    modalidad: draft.modalidad,
    inicio_at: toUtcIso(draft.inicio_at),
    fin_at: toUtcIso(draft.fin_at),
    organizador: (draft.organizador || '').trim(),
    organizador_usuario_id: draft.organizador_usuario_id || null,
    responsable_usuario_id: draft.responsable_usuario_id || null,
    motivo: draft.motivo?.trim() || null,
    prioridad: draft.prioridad,
    clasificacion_id: draft.clasificacion_id || null,
    precision_fecha: draft.precision_fecha || 'EXACTA',
    timezone: GT_TIME_ZONE,
    etiquetas: asArray(draft.etiquetas).map((tag) => (
      typeof tag === 'object' && tag !== null ? tag.id || tag.nombre : tag
    )).filter(Boolean),
    campos_personalizados: draft.campos_personalizados || {},
    recurrencia: recurrence,
  };
}

export function serializeParticipants(participants = []) {
  return participants
    .filter((participant) => participant.usuario_id || hasText(participant.nombre) || hasText(participant.nombre_externo))
    .map((participant) => {
      const internal = Boolean(participant.usuario_id);
      const externalName = participant.nombre_externo?.trim() || participant.nombre?.trim() || null;
      return {
        usuario_id: internal ? Number(participant.usuario_id) : null,
        nombre: internal ? null : externalName,
        nombre_externo: internal ? null : externalName,
        organizacion_externa: internal ? null : participant.organizacion_externa?.trim() || null,
        convocado: participant.convocado !== false,
        asistio: participant.asistio === '' ? null : participant.asistio,
        asistencia:
          participant.asistio === true ? 'ASISTIO' : participant.asistio === false ? 'NO_ASISTIO' : 'PENDIENTE',
        funcion: participant.funcion?.trim() || null,
        responsable_documental: Boolean(participant.responsable_documental),
      };
    });
}

export function serializeReport(report = {}) {
  return Object.fromEntries(
    REPORT_FIELDS.map(([field]) => [field, String(report[field] || '').trim()])
  );
}

export function serializeAgreement(agreement) {
  return {
    descripcion: agreement.descripcion.trim(),
    responsables: asArray(agreement.responsables)
      .filter((responsible) => responsible.usuario_id || hasText(responsible.nombre) || hasText(responsible.nombre_externo))
      .map((responsible) => {
        const internal = responsible.tipo !== 'externo' && Boolean(responsible.usuario_id);
        const externalName = responsible.nombre_externo?.trim() || responsible.nombre?.trim() || null;
        return {
          usuario_id: internal ? Number(responsible.usuario_id) : null,
          nombre: internal ? null : externalName,
          nombre_externo: internal ? null : externalName,
          organizacion_externa: internal ? null : responsible.organizacion_externa?.trim() || null,
        };
      }),
    vencimiento_at: toUtcIso(agreement.vencimiento_at),
    prioridad: agreement.prioridad || 'MEDIA',
    estado: agreement.estado || 'PENDIENTE',
    evidencia_cumplimiento: agreement.evidencia_cumplimiento?.trim() || null,
  };
}

export const ACCEPTED_EVIDENCE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
];

export const MAX_EVIDENCE_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_EVIDENCE_ACTIVITY_BYTES = 100 * 1024 * 1024;

export function validateEvidenceFiles(files, existingBytes = 0) {
  const selected = Array.from(files || []);
  const errors = [];
  selected.forEach((file) => {
    if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
      errors.push(`${file.name}: formato no permitido.`);
    }
    if (file.size > MAX_EVIDENCE_FILE_BYTES) {
      errors.push(`${file.name}: supera 25 MiB.`);
    }
  });
  const total = selected.reduce((sum, file) => sum + file.size, existingBytes);
  if (total > MAX_EVIDENCE_ACTIVITY_BYTES) errors.push('La actividad supera 100 MiB de evidencias.');
  return errors;
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

export function isNarrativeLocked(activity) {
  return [DOCUMENT_STATUS.ENVIADA, DOCUMENT_STATUS.COMPLETA].includes(
    activity?.estado_documentacion
  );
}

export function statusCount(payload, ...keys) {
  for (const key of keys) {
    const value = payload?.[key];
    if (typeof value === 'number') return value;
    if (Array.isArray(value)) return value.length;
    if (value && typeof value.total === 'number') return value.total;
  }
  return 0;
}

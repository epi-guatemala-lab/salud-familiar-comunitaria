import { api, ApiError } from '../../lib/api';
import { VITE_API_URL } from '../../config/env';
import { STORAGE_KEYS, EVENTS } from '../../config/constants';

const ROOT = '/api/bitacora';
const API_BASE = VITE_API_URL.replace(/\/$/, '');

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else {
      query.set(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

function mutationHeaders({ version, idempotencyKey } = {}) {
  return {
    ...(version !== undefined && version !== null ? { 'If-Match': String(version) } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };
}

function activityQuery(params = {}) {
  const normalized = { ...params };
  if (
    !normalized.campo_clave
    || normalized.campo_valor === ''
    || normalized.campo_valor === null
    || normalized.campo_valor === undefined
  ) {
    delete normalized.campo_clave;
    delete normalized.campo_valor;
  }
  return queryString(normalized);
}

export function newIdempotencyKey(prefix = 'bitacora') {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return `${prefix}-${random}`;
}

function token() {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

async function parseUploadResponse(response) {
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent(EVENTS.AUTH_INVALIDATED));
    throw new ApiError('Sesión inválida o expirada', 401, 'UNAUTHORIZED');
  }
  if (!response.ok) {
    const detail = body.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.detail || detail?.message || body.message || `Error ${response.status}`;
    throw new ApiError(
      message,
      response.status,
      detail?.code || body.code,
      detail?.field || body.field,
      detail?.context || body.context
    );
  }
  return body;
}

async function upload(path, formData, { version, idempotencyKey } = {}) {
  const headers = mutationHeaders({ version, idempotencyKey });
  const authToken = token();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let lastError;
  const attempts = idempotencyKey ? 2 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'omit',
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      return await parseUploadResponse(response);
    } catch (error) {
      window.clearTimeout(timeout);
      lastError = error;
      const status = Number(error?.status || 0);
      const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
      if (!retryable || attempt === attempts) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

async function download(path) {
  const headers = {};
  const authToken = token();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers,
    credentials: 'omit',
  });
  if (!response.ok) return parseUploadResponse(response);
  return {
    blob: await response.blob(),
    filename: response.headers.get('content-disposition')?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)?.[1],
  };
}

export const bitacoraApi = {
  dashboard: () => api.get(`${ROOT}/dashboard`),

  listPeople: (params) => api.get(`${ROOT}/personas${queryString(params)}`),
  getConfiguration: () => api.get(`${ROOT}/configuracion`),
  listCatalogs: () => api.get(`${ROOT}/catalogos`),
  listCatalogValues: (catalogKey, params) =>
    api.get(`${ROOT}/catalogos/${encodeURIComponent(catalogKey)}/valores${queryString(params)}`),

  listActivities: (params) => api.get(`${ROOT}/actividades${activityQuery(params)}`),
  getActivity: (id) => api.get(`${ROOT}/actividades/${id}`),
  createActivity: (payload, idempotencyKey = newIdempotencyKey('actividad')) =>
    api.post(`${ROOT}/actividades`, payload, {
      headers: mutationHeaders({ idempotencyKey }),
      maxRetries: 2,
    }),
  updateActivity: (id, payload, { version, scope = 'single' } = {}) =>
    api.put(`${ROOT}/actividades/${id}${queryString({ scope })}`, payload, {
      headers: mutationHeaders({ version }),
    }),

  action: (id, action, payload = {}, { version, idempotencyKey, scope = 'single' } = {}) =>
    api.post(`${ROOT}/actividades/${id}/${action}${queryString({ scope })}`, payload, {
      headers: mutationHeaders({
        version,
        idempotencyKey: idempotencyKey || newIdempotencyKey(action),
      }),
      maxRetries: 2,
    }),

  saveParticipants: (id, participants, version) =>
    api.put(`${ROOT}/actividades/${id}/participantes`, { participantes: participants }, {
      headers: mutationHeaders({ version }),
    }),
  saveReport: (id, report, version) =>
    api.put(`${ROOT}/actividades/${id}/informe`, report, {
      headers: mutationHeaders({ version }),
    }),

  listAgreements: (activityId, params) =>
    api.get(`${ROOT}/actividades/${activityId}/acuerdos${queryString(params)}`),
  createAgreement: (
    activityId,
    agreement,
    idempotencyKey = newIdempotencyKey('acuerdo')
  ) =>
    api.post(`${ROOT}/actividades/${activityId}/acuerdos`, agreement, {
      headers: mutationHeaders({ idempotencyKey }),
      maxRetries: 2,
    }),
  updateAgreement: (id, agreement, version) =>
    api.put(`${ROOT}/acuerdos/${id}`, agreement, {
      headers: mutationHeaders({ version }),
    }),
  archiveAgreement: (
    id,
    reason,
    version,
    idempotencyKey = newIdempotencyKey('archivar')
  ) =>
    api.post(`${ROOT}/acuerdos/${id}/archivar`, { motivo: reason }, {
      headers: mutationHeaders({ version, idempotencyKey }),
      maxRetries: 2,
    }),

  listEvidence: (activityId) => api.get(`${ROOT}/actividades/${activityId}/evidencias`),
  uploadEvidence: (
    activityId,
    file,
    metadata = {},
    idempotencyKey = newIdempotencyKey('evidencia')
  ) => {
    const body = new FormData();
    body.append('archivo', file, file.name);
    body.append('descripcion', metadata.descripcion || '');
    return upload(`${ROOT}/actividades/${activityId}/evidencias`, body, {
      idempotencyKey,
    });
  },
  replaceEvidence: (
    evidenceId,
    file,
    reason,
    idempotencyKey = newIdempotencyKey('sustituir')
  ) => {
    const body = new FormData();
    body.append('archivo', file, file.name);
    body.append('motivo', reason);
    return upload(`${ROOT}/evidencias/${evidenceId}/sustituir`, body, {
      idempotencyKey,
    });
  },
  downloadEvidence: (evidenceId) => download(`${ROOT}/evidencias/${evidenceId}/descarga`),
  evidenceDownloadUrl: (evidenceId) => `${API_BASE}${ROOT}/evidencias/${evidenceId}/descarga`,

  listNotifications: (params) => api.get(`${ROOT}/notificaciones${queryString(params)}`),
  readNotification: (id, idempotencyKey = newIdempotencyKey('leer')) =>
    api.post(`${ROOT}/notificaciones/${id}/leer`, {}, {
      headers: mutationHeaders({ idempotencyKey }),
      maxRetries: 2,
    }),
};

export { queryString };

import { VITE_API_URL, BASE_URL } from '../config/env';
import { STORAGE_KEYS, EVENTS } from '../config/constants';

const BASE = VITE_API_URL.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, code, field, context) {
    super(message || 'Error');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
    this.context = context;
    this.networkError = status === 0;
  }
}

function getToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

async function request(method, path, body, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(opts.headers || {}),
  };
  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = opts.timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let lastErr = null;
  const maxRetries = method === 'GET' ? (opts.maxRetries ?? 3) : (opts.maxRetries ?? 1);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== null && body !== undefined ? JSON.stringify(body) : null,
        signal: controller.signal,
        credentials: 'omit',
      });

      if (res.status === 401 && opts.auth !== false) {
        clearTimeout(timeoutId);
        window.dispatchEvent(new CustomEvent(EVENTS.AUTH_INVALIDATED));
        throw new ApiError('Sesion invalida o expirada', 401, 'UNAUTHORIZED');
      }

      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // respuesta no-JSON: si OK lo dejamos como texto plano
          data = { raw: text };
        }
      }

      if (!res.ok) {
        clearTimeout(timeoutId);
        throw new ApiError(
          data.detail || data.message || `Error ${res.status}`,
          res.status,
          data.code,
          data.field,
          data.context
        );
      }
      clearTimeout(timeoutId);
      return data;
    } catch (err) {
      lastErr = err;

      // AbortError → timeout, no retry
      if (err.name === 'AbortError') {
        lastErr = new ApiError('Tiempo de espera agotado', 0, 'TIMEOUT');
        break;
      }

      // Errores de red (fetch falla pre-respuesta) → ApiError status 0
      const isNetwork = !(err instanceof ApiError);
      const status = err.status ?? 0;

      // 4xx (excepto 408/429) no se reintentan
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) break;

      if (attempt < maxRetries) {
        // backoff exponencial con jitter
        const delay = Math.min(8000, 500 * Math.pow(2, attempt - 1)) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
      } else if (isNetwork) {
        lastErr = new ApiError('No se pudo contactar al servidor', 0, 'NETWORK');
      }
    }
  }

  clearTimeout(timeoutId);
  throw lastErr;
}

export const api = {
  get: (path, opts) => request('GET', path, null, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  put: (path, body, opts) => request('PUT', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  del: (path, opts) => request('DELETE', path, null, opts),
};

// Listener global: 401 → limpiar credenciales + redirigir a landing.
if (typeof window !== 'undefined') {
  window.addEventListener(EVENTS.AUTH_INVALIDATED, () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {
      /* noop */
    }
    if (!location.pathname.includes('/login')) {
      // Solo redirigir si no estamos ya en login
      const target = BASE_URL || '/';
      if (location.pathname !== target) {
        location.href = target;
      }
    }
  });
}

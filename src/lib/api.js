import { VITE_API_URL, BASE_URL } from '../config/env';
import { STORAGE_KEYS, EVENTS } from '../config/constants';

const BASE = VITE_API_URL.replace(/\/$/, '');

// Traductor de mensajes Pydantic crudos (en inglés) al español del usuario.
// Si no encuentra match, devuelve un fallback amable en español sin tirar el detalle.
function translatePydanticMsg(rawMsg) {
  if (!rawMsg) return 'Datos inválidos.';
  const s = String(rawMsg);
  // "Input should be 'X', 'Y' or 'Z'"
  const m1 = s.match(/Input should be\s+(.+)$/i);
  if (m1) return `Valor inválido. Esperado: ${m1[1]}.`;
  if (/Field required/i.test(s)) return 'Campo obligatorio.';
  if (/value is not a valid (integer|int)/i.test(s)) return 'Debe ser un número entero.';
  if (/value is not a valid float|number/i.test(s)) return 'Debe ser un número.';
  if (/value is not a valid (date|datetime)/i.test(s)) return 'Fecha inválida.';
  if (/value is not a valid email/i.test(s)) return 'Correo electrónico inválido.';
  if (/string_too_short/i.test(s) || /at least \d+ character/i.test(s)) return 'Demasiado corto.';
  if (/string_too_long/i.test(s) || /at most \d+ character/i.test(s)) return 'Demasiado largo.';
  if (/greater than/i.test(s)) return 'Valor fuera de rango (muy bajo).';
  if (/less than/i.test(s)) return 'Valor fuera de rango (muy alto).';
  return s; // fallback: devolver el mensaje original (mejor algo en inglés que nada)
}

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
        // FastAPI envuelve los errores en {detail: ...}. `detail` puede ser:
        //   - string: "mensaje plano"
        //   - objeto: {detail, code, field, context} (formato custom de SFyC backend)
        //   - array: [{loc, msg, type}] (validación Pydantic)
        // Extraemos mensaje + metadata sin romper ninguno.
        const d = data.detail;
        let message, code, field, context;
        if (typeof d === 'string') {
          message = d;
        } else if (Array.isArray(d) && d.length > 0) {
          // Pydantic validation errors → traducir al español
          const first = d[0];
          const rawMsg = first.msg || first.message || `Error ${res.status}`;
          message = translatePydanticMsg(rawMsg);
          field = Array.isArray(first.loc) ? first.loc.slice(-1)[0] : undefined;
        } else if (d && typeof d === 'object') {
          message = d.detail || d.message || d.error || `Error ${res.status}`;
          code = d.code;
          field = d.field;
          context = d.context;
        } else {
          message = data.message || `Error ${res.status}`;
        }
        // Top-level también puede tener code/field si el backend los pone fuera de detail
        code = code || data.code;
        field = field || data.field;
        context = context || data.context;
        throw new ApiError(message, res.status, code, field, context);
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

// Motor de la cola offline para el formulario público de satisfacción.
// Vive a nivel de módulo (fuera de React) para que exista UNA sola instancia
// por pestaña: el drenaje lo dispara <OfflineQueueSync/> (montado una vez en
// App) y useOfflineQueue solo refleja el estado. Antes cada consumidor
// registraba sus propios listeners de red y la cola se drenaba en paralelo
// (SatisfaccionPage y Footer a la vez).
import { api } from './api';
import { STORAGE_KEYS } from '../config/constants';
import { getJSON, setJSON } from './storage';

const QUEUE_KEY = STORAGE_KEYS.OFFLINE_QUEUE;
export { QUEUE_KEY };

const MAX_ITEMS = 50;
// TTL ampliado de 24 h a 7 días: quien deja la encuesta pendiente el viernes
// ya no la pierde al volver el lunes.
const TTL_MS = 7 * 24 * 3600 * 1000;
// El backend acepta 1 envío cada 5 s por IP: esperamos un poco más entre
// ítems consecutivos para no entregar la cuota completa en 429s.
const ITEM_SPACING_MS = 5200;

const listeners = new Set();

// Estado de conexión a nivel de módulo: lo actualiza OfflineQueueSync con los
// eventos de window y los hooks lo leen vía getSnapshot()/subscribe().
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Guard de drenaje: promesa del flush en curso (null si no hay ninguno).
let flushPromise = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function loadQueue() {
  const stored = getJSON(QUEUE_KEY, []);
  if (!Array.isArray(stored)) return [];
  const now = Date.now();
  const valid = stored.filter((i) => i && typeof i.ts === 'number');
  const alive = valid.filter((i) => now - i.ts < TTL_MS);
  const expired = valid.length - alive.length;
  if (expired > 0) {
    // Observabilidad de la purga por TTL: no hay UI para esto.
    console.warn(`[offlineQueue] ${expired} ítem(s) purgado(s) por TTL de 7 días`);
  }
  return alive;
}

export function saveQueue(items) {
  setJSON(QUEUE_KEY, items.slice(0, MAX_ITEMS));
}

function notify(items) {
  listeners.forEach((cb) => {
    try {
      cb(items);
    } catch {
      // un suscriptor defectuoso no debe romper el motor
    }
  });
}

// Re-notifica el estado actual; lo usa OfflineQueueSync cuando OTRA pestaña
// tocó la clave (evento 'storage') para sincronizar contadores cross-tab.
export function refresh() {
  notify(loadQueue());
}

// OfflineQueueSync es el único escritor del estado de conexión del módulo.
export function setOnline(next) {
  if (isOnline === next) return;
  isOnline = next;
  refresh();
}

export function enqueue(path, body) {
  const item = {
    id: Math.random().toString(36).slice(2),
    ts: Date.now(),
    path,
    body,
  };
  const next = [item, ...loadQueue()];
  if (!saveQueue(next)) {
    // localStorage no pudo persistir (cuota llena): el ítem vive en el
    // overlay en memoria de esta pestaña y el drenaje seguirá funcionando
    // mientras no se cierre, pero no sobrevivirá a la sesión.
    console.warn('[offlineQueue] la cola no se persistió (¿localStorage lleno?); el envío pendiente vive solo en esta pestaña');
  }
  notify(next);
  return item;
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getCount() {
  return loadQueue().length;
}

// Lectura completa para el estado inicial de los hooks.
export function getSnapshot() {
  return { items: loadQueue(), isOnline, flushing: flushPromise !== null };
}

// Remueve UN ítem por id releyendo el storage vigente. Nunca se escribe la
// cola completa desde el snapshot del pase: así un enqueue() concurrente
// (misma pestaña u otra) no puede ser pisado.
function removeById(id) {
  saveQueue(loadQueue().filter((i) => i.id !== id));
}

async function runFlush(pending) {
  let sent = 0;
  let failed = 0;
  let throttled = false;
  for (let i = 0; i < pending.length; i += 1) {
    const item = pending[i];
    // Espaciado antes de cada POST que no sea el primero (rate limit 1/5 s).
    if (i > 0) await wait(ITEM_SPACING_MS);
    try {
      await api.post(item.path, item.body, { auth: false, maxRetries: 1 });
      sent += 1;
      // El avance se persiste ítem a ítem: cerrar la pestaña a mitad del
      // pase ya no reenvía lo entregado (el dedup por uuid lo absorbía, pero
      // quemaba la cuota 1/5 s por IP).
      removeById(item.id);
    } catch (err) {
      const status = err?.status ?? 0;
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
        // Error de validación: reintentar no tiene sentido, se descarta.
        failed += 1;
        removeById(item.id);
        continue;
      }
      if (status === 429) {
        // La IP está throttled: abortar el pase completo. Este ítem y los
        // aún no intentados quedan en storage tal cual para el próximo pase.
        throttled = true;
        break;
      }
      // Transitorio (408/5xx/red): se conserva en storage tal cual.
    }
  }
  // Sin notify final aquí: lo emite flush() en el .finally, ya con
  // flushPromise=null, para que el último snapshot de los suscriptores no
  // quede estancado en flushing=true.
  return { sent, failed, throttled };
}

export function flush() {
  // Nunca dos drenajes concurrentes en la misma pestaña: se devuelve la
  // promesa del pase en curso.
  if (flushPromise) return flushPromise;
  const pending = loadQueue();
  if (pending.length === 0) {
    return Promise.resolve({ sent: 0, failed: 0, throttled: false });
  }
  // El guard se libera pase lo que pase: un runFlush que estallara por una
  // vía no contemplada no dejaría la cola congelada hasta recargar. El
  // notify va DESPUÉS de liberarlo: la última notificación del pase llega
  // con flushing ya en false.
  flushPromise = runFlush(pending).finally(() => {
    flushPromise = null;
    notify(loadQueue());
  });
  notify(pending); // flushing pasó a true: reflejarlo en la UI
  return flushPromise;
}

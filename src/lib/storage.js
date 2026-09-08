// Wrappers para localStorage con fallback en memoria si esta deshabilitado
// (modo incognito en algunos browsers, quotas, etc.).

const memoryStore = new Map();

let storageWorks = null;
// Se activa cuando una escritura a localStorage falla a mitad de sesión
// (típicamente QuotaExceededError): a partir de ahí este origen vive del
// overlay en memoria TAMBIÉN para leer. Sin esto las escrituras caían al Map
// pero las lecturas seguían saliendo de localStorage (que lee sin error bajo
// cuota llena) y el estado se partía: lo recién encolado se volvía invisible.
let memoryOnly = false;

function check() {
  if (storageWorks !== null) return storageWorks;
  try {
    const k = '__sfyc_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
  return storageWorks;
}

export function safeGet(key) {
  if (memoryOnly && memoryStore.has(key)) return memoryStore.get(key);
  if (!check()) return memoryStore.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function safeSet(key, value) {
  if (!check()) {
    memoryStore.set(key, value);
    return false;
  }
  try {
    localStorage.setItem(key, value);
    // Espejar en el overlay aun con éxito: si la sesión ya cayó a memoryOnly
    // (cuota reventada antes) una lectura posterior preferiría el overlay y
    // devolvería el valor VIEJO aunque esta escritura sí llegó a disco.
    memoryStore.set(key, value);
    return true;
  } catch {
    memoryOnly = true;
    memoryStore.set(key, value);
    return false;
  }
}

export function safeRemove(key) {
  memoryStore.delete(key);
  if (!check()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function safeClearPrefix(prefix) {
  // El overlay se barre SIEMPRE: si la sesión está en memoryOnly, limpiar
  // solo localStorage dejaría las claves vivas en el overlay de lectura.
  for (const k of Array.from(memoryStore.keys())) {
    if (k.startsWith(prefix)) memoryStore.delete(k);
  }
  if (!check()) return;
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

export function getJSON(key, fallback = null) {
  const raw = safeGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  return safeSet(key, JSON.stringify(value));
}

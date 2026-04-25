// Wrappers para localStorage con fallback en memoria si esta deshabilitado
// (modo incognito en algunos browsers, quotas, etc.).

const memoryStore = new Map();

let storageWorks = null;

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
    return true;
  } catch {
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
  if (!check()) {
    for (const k of Array.from(memoryStore.keys())) {
      if (k.startsWith(prefix)) memoryStore.delete(k);
    }
    return;
  }
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

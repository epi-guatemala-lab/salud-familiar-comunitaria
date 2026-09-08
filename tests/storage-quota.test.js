import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Regresión del split-brain del overlay: tras un fallo de cuota (memoryOnly),
// una escritura posterior que SÍ cabe en localStorage debe reflejarse también
// en el overlay — si no, safeGet devolvía el valor viejo para siempre.
// storage.js cachea su sondeo y su estado a nivel de módulo: cada caso recarga
// el módulo con un localStorage cuyo setItem revienta solo para valores grandes.
const makeQuotaLS = () => {
  const store = new Map();
  return {
    setItem(k, v) {
      if (String(v).length > 20) {
        const e = new Error('The quota has been exceeded.');
        e.name = 'QuotaExceededError';
        throw e;
      }
      store.set(k, String(v));
    },
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    removeItem: (k) => store.delete(k),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
};

describe('storage overlay bajo cuota llena', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', makeQuotaLS());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const load = () => import('../src/lib/storage');

  it('una escritura exitosa tras el fallo de cuota actualiza el overlay', async () => {
    const { setJSON, getJSON } = await load();
    const r1 = setJSON('k', { v: 'A'.repeat(40) }); // revienta → overlay + memoryOnly
    expect(r1).toBe(false);
    const r2 = setJSON('k', { v: 'chico' }); // cabe → localStorage Y overlay
    expect(r2).toBe(true);
    expect(getJSON('k')).toEqual({ v: 'chico' }); // antes del fix: {v: AAAA…}
  });

  it('safeRemove limpia también el overlay tras caer a memoryOnly', async () => {
    const { setJSON, safeRemove, safeGet } = await load();
    setJSON('k', { v: 'A'.repeat(40) }); // activa memoryOnly
    safeRemove('k');
    expect(safeGet('k')).toBeNull();
  });

  it('safeClearPrefix barre el overlay aunque localStorage funcione', async () => {
    const { setJSON, safeClearPrefix, getJSON } = await load();
    setJSON('p1', { v: 'A'.repeat(40) }); // overlay + memoryOnly
    setJSON('p2', { v: 1 }); // cabe
    safeClearPrefix('p');
    expect(getJSON('p1')).toBeNull();
    expect(getJSON('p2')).toBeNull();
  });
});

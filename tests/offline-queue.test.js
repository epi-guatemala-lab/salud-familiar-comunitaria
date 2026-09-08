import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  QUEUE_KEY,
  enqueue,
  flush,
  getCount,
  getSnapshot,
  loadQueue,
  subscribe,
} from '../src/lib/offlineQueue';
import { getJSON, setJSON, safeRemove } from '../src/lib/storage';

// Mock del cliente HTTP: el motor solo debe hablar con api.post.
const apiPost = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/api', () => ({ api: { post: apiPost } }));

const PATH = '/api/encuesta';
const DAY_MS = 24 * 3600 * 1000;
const SPACING = 5200; // ITEM_SPACING_MS del motor

const errWithStatus = (status) => Object.assign(new Error(`Error ${status}`), { status });

describe('cola offline (motor)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiPost.mockReset();
    // En este entorno window.localStorage es undefined (storage.js cae al
    // Map en memoria) y el clear() de setup.js no lo alcanza: hay que
    // limpiar la clave con el propio wrapper para aislar cada caso.
    safeRemove(QUEUE_KEY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('envía un ítem encolado y vacía la cola', async () => {
    apiPost.mockResolvedValue({ ok: true });
    enqueue(PATH, { n: 1 });
    const res = await flush();
    expect(res).toEqual({ sent: 1, failed: 0, throttled: false });
    expect(apiPost).toHaveBeenCalledWith(PATH, { n: 1 }, { auth: false, maxRetries: 1 });
    expect(getCount()).toBe(0);
  });

  it('aborta el pase con 429 y conserva todo en cola', async () => {
    apiPost.mockRejectedValueOnce(errWithStatus(429));
    enqueue(PATH, { n: 1 });
    enqueue(PATH, { n: 2 });
    const res = await flush();
    expect(res).toEqual({ sent: 0, failed: 0, throttled: true });
    // La IP está throttled: el 2º ítem ya no se intenta en este pase.
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(getCount()).toBe(2);
  });

  it('descarta el ítem ante un 4xx de validación', async () => {
    apiPost.mockRejectedValueOnce(errWithStatus(400));
    enqueue(PATH, { n: 1 });
    const res = await flush();
    expect(res).toEqual({ sent: 0, failed: 1, throttled: false });
    expect(getCount()).toBe(0);
  });

  it('conserva el ítem ante un 5xx transitorio', async () => {
    apiPost.mockRejectedValueOnce(errWithStatus(503));
    enqueue(PATH, { n: 1 });
    const res = await flush();
    expect(res).toEqual({ sent: 0, failed: 0, throttled: false });
    expect(getCount()).toBe(1);
  });

  it('espacia ≥5200 ms entre POSTs consecutivos', async () => {
    const stamps = [];
    apiPost.mockImplementation(async () => stamps.push(Date.now()));
    enqueue(PATH, { n: 1 });
    enqueue(PATH, { n: 2 });
    const result = flush();
    expect(apiPost).toHaveBeenCalledTimes(1); // el 1º sale inmediato
    await vi.advanceTimersByTimeAsync(SPACING);
    await result;
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(SPACING);
  });

  it('aplica TTL de 7 días: 6 días se conserva, 8 días se purga', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setJSON(QUEUE_KEY, [{ id: 'a', ts: Date.now() - 6 * DAY_MS, path: PATH, body: {} }]);
    expect(getCount()).toBe(1);

    setJSON(QUEUE_KEY, [{ id: 'b', ts: Date.now() - 8 * DAY_MS, path: PATH, body: {} }]);
    expect(getCount()).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // flush tampoco lo intenta.
    const res = await flush();
    expect(res).toEqual({ sent: 0, failed: 0, throttled: false });
    expect(apiPost).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('no pierde ítems encolados DURANTE un flush en curso (race del snapshot)', async () => {
    // Regresión del bug crítico: el saveQueue(remaining) final pisaba lo
    // encolado a mitad de pase y lo perdía en silencio.
    let resolveFirst;
    apiPost.mockImplementationOnce(() => new Promise((res) => { resolveFirst = res; }));
    enqueue(PATH, { n: 1 });
    const done = flush();
    // El POST del único ítem está en vuelo cuando llega una 2ª encuesta.
    enqueue(PATH, { n: 2 });
    resolveFirst({ ok: true });
    const res = await done;
    expect(res).toEqual({ sent: 1, failed: 0, throttled: false });
    expect(getCount()).toBe(1);
    expect(getJSON(QUEUE_KEY, [])[0].body).toEqual({ n: 2 });
  });

  it('remueve de storage cada ítem apenas se entrega (no solo al final del pase)', async () => {
    let resolveSecond;
    apiPost.mockImplementationOnce(async () => ({ ok: true })); // 1º entrega
    apiPost.mockImplementationOnce(() => new Promise((res) => { resolveSecond = res; })); // 2º en vuelo
    enqueue(PATH, { n: 1 });
    enqueue(PATH, { n: 2 });
    const done = flush();
    await vi.advanceTimersByTimeAsync(SPACING); // 1º enviado y removido, 2º en vuelo
    expect(getCount()).toBe(1); // cerrar la pestaña aquí ya no reenvía el 1º
    expect(getJSON(QUEUE_KEY, [])[0].body).toEqual({ n: 1 });
    resolveSecond({ ok: true });
    const res = await done;
    expect(res.sent).toBe(2);
    expect(getCount()).toBe(0);
  });

  it('la última notificación del pase llega con flushing ya en false', async () => {
    // Regresión: el notify final vivía dentro de runFlush, antes del .finally
    // que libera flushPromise → el último snapshot de los suscriptores quedó
    // estancado en flushing=true.
    apiPost.mockResolvedValue({ ok: true });
    const flags = [];
    subscribe(() => flags.push(getSnapshot().flushing));
    enqueue(PATH, { n: 1 });
    await flush();
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[flags.length - 1]).toBe(false);
  });

  it('no ejecuta dos flushes concurrentes: devuelven la misma promesa', async () => {
    apiPost.mockResolvedValue({ ok: true });
    enqueue(PATH, { n: 1 });
    enqueue(PATH, { n: 2 });
    const p1 = flush();
    const p2 = flush();
    expect(p2).toBe(p1);
    await vi.advanceTimersByTimeAsync(SPACING);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(r2);
    expect(r1).toEqual({ sent: 2, failed: 0, throttled: false });
    // Sin intercalación: 2 ítems → exactamente 2 POSTs.
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(getCount()).toBe(0);
  });

  it('persiste como máximo 50 ítems (cap MAX_ITEMS)', () => {
    for (let i = 0; i < 51; i += 1) enqueue(PATH, { n: i });
    expect(getJSON(QUEUE_KEY, [])).toHaveLength(50);
    expect(getCount()).toBe(50);
    const items = loadQueue();
    expect(items[0].body).toEqual({ n: 50 }); // el más nuevo se conserva
    expect(items.some((i) => i.body.n === 0)).toBe(false); // el más viejo se cae
  });

  it('notifica a los suscriptores con el array actualizado', () => {
    const seen = [];
    const unsubscribe = subscribe((items) => seen.push(items));
    enqueue(PATH, { n: 1 });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toHaveLength(1);
    expect(seen[0][0].body).toEqual({ n: 1 });
    unsubscribe();
    enqueue(PATH, { n: 2 });
    expect(seen).toHaveLength(1); // tras desuscribir no llegan más notificaciones
    expect(getCount()).toBe(2);
  });
});

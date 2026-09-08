import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// El protocolo de lib/tabUuid vive en un singleton por página (una página =
// un canal de BroadcastChannel). Para simular páginas distintas se recarga el
// módulo (vi.resetModules) y se conectan sus canales a un bus compartido que
// entrega a todos los demás, como hace BroadcastChannel entre pestañas.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const X = '11111111-2222-3333-4444-555555555555';

class FakeBus {
  constructor() {
    this.channels = new Set();
  }

  join() {
    const self = this;
    const ch = {
      onmessage: null,
      postMessage(data) {
        self.channels.forEach((other) => {
          if (other !== ch && other.onmessage) {
            queueMicrotask(() => other.onmessage({ data: JSON.parse(JSON.stringify(data)) }));
          }
        });
      },
      close() {
        self.channels.delete(ch);
      },
    };
    this.channels.add(ch);
    return ch;
  }
}

// Bus de entrega MANUAL (para casos con retardo): los mensajes se quedan en
// una cola y se entregan con pump(). Como BroadcastChannel real, cada mensaje
// solo alcanza a los canales ABIERTOS al momento del envío.
class PumpBus {
  constructor() {
    this.channels = new Set();
    this.outbox = [];
  }

  join() {
    const self = this;
    const ch = {
      onmessage: null,
      postMessage(data) {
        const recipients = Array.from(self.channels).filter((o) => o !== ch && o.onmessage);
        self.outbox.push({ data: JSON.parse(JSON.stringify(data)), recipients });
      },
      close() {
        self.channels.delete(ch);
      },
    };
    this.channels.add(ch);
    return ch;
  }

  pump() {
    const box = this.outbox;
    this.outbox = [];
    box.forEach(({ data, recipients }) => {
      recipients.forEach((r) => r.onmessage({ data }));
    });
  }
}

async function newPage(bus, storedInitial) {
  vi.resetModules();
  const mod = await import('../src/lib/tabUuid');
  let stored = storedInitial;
  const state = { resolved: [], written: [] };
  mod.resolveTabUuid({
    read: () => stored,
    write: (u) => {
      state.written.push(u);
      stored = u;
    },
    onResolved: (u) => state.resolved.push(u),
    channel: () => bus.join(),
  });
  return { state, getStored: () => stored };
}

describe('uuid idempotente por pestaña (handshake)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin uuid almacenado acuña uno nuevo y lo persiste', async () => {
    const page = await newPage(new FakeBus(), null);
    expect(page.state.resolved).toHaveLength(1);
    expect(page.state.written).toHaveLength(1);
    expect(page.state.resolved[0]).toMatch(UUID_RE);
    expect(page.state.resolved[0]).toBe(page.state.written[0]);
  });

  it('con uuid inválido almacenado acuña uno nuevo', async () => {
    const page = await newPage(new FakeBus(), 'no-soy-un-uuid');
    expect(page.state.resolved).toHaveLength(1);
    expect(page.state.resolved[0]).toMatch(UUID_RE);
    expect(page.state.written).toHaveLength(1);
  });

  it('recarga de la misma pestaña (nadie más vivo): conserva el uuid', async () => {
    const page = await newPage(new FakeBus(), X);
    expect(page.state.resolved).toHaveLength(0); // handshake en vuelo
    await vi.advanceTimersByTimeAsync(150);
    expect(page.state.resolved).toEqual([X]);
    expect(page.state.written).toHaveLength(0); // no reescribe
  });

  it('pestaña duplicada: la original defiende y la copia acuña uno nuevo', async () => {
    const bus = new FakeBus();
    // Pestaña A: carga, resuelve por timeout (nadie más).
    const a = await newPage(bus, X);
    await vi.advanceTimersByTimeAsync(150);
    expect(a.state.resolved).toEqual([X]);

    // Pestaña B duplicada de A: sessionStorage copiado → mismo X.
    const b = await newPage(bus, X);
    await vi.advanceTimersByTimeAsync(0); // drenar microtasks del claim→mine
    expect(b.state.resolved).toHaveLength(1);
    expect(b.state.resolved[0]).toMatch(UUID_RE);
    expect(b.state.resolved[0]).not.toBe(X);
    expect(b.state.written).toEqual([b.state.resolved[0]]);
    expect(a.getStored()).toBe(X); // el storage de A no fue tocado
  });

  it('la defensa sigue viva tras resolver: una copia tardía también renueva', async () => {
    const bus = new FakeBus();
    const a = await newPage(bus, X);
    await vi.advanceTimersByTimeAsync(150);
    expect(a.state.resolved).toEqual([X]);

    // La copia aparece bastante después de que A ya resolvió.
    const b = await newPage(bus, X);
    await vi.advanceTimersByTimeAsync(0);
    expect(b.state.resolved[0]).not.toBe(X);
  });

  it('la copia que ya renovó defiende su uuid NUEVO ante una segunda copia', async () => {
    const bus = new FakeBus();
    const a = await newPage(bus, X);
    await vi.advanceTimersByTimeAsync(150);
    const b = await newPage(bus, X); // copia de A
    await vi.advanceTimersByTimeAsync(0);
    const y = b.state.resolved[0];
    expect(y).not.toBe(X);

    // D duplica a B (hereda el uuid renovado Y de B).
    const d = await newPage(bus, y);
    await vi.advanceTimersByTimeAsync(0);
    expect(d.state.resolved[0]).not.toBe(y); // B la defendió
    expect(d.state.resolved[0]).toMatch(UUID_RE);
  });

  it('claim por un uuid que nadie posee: resuelve por timeout conservándolo', async () => {
    const bus = new FakeBus();
    const stranger = await newPage(bus, '99999999-8888-7777-6666-555555555555');
    await vi.advanceTimersByTimeAsync(150);
    expect(stranger.state.resolved).toHaveLength(1);
    expect(stranger.state.resolved[0]).toBe('99999999-8888-7777-6666-555555555555');
  });

  it('sin canal disponible conserva el almacenado (sin handshake)', async () => {
    vi.resetModules();
    const mod = await import('../src/lib/tabUuid');
    const resolved = [];
    mod.resolveTabUuid({
      read: () => X,
      write: () => {},
      onResolved: (u) => resolved.push(u),
      channel: () => null,
    });
    expect(resolved).toEqual([X]);
  });

  it('dos pestañas restauradas A LA VEZ con el mismo uuid: solo una lo conserva', async () => {
    const bus = new FakeBus();
    const a = await newPage(bus, X); // claim de A en vuelo antes de que B exista
    const b = await newPage(bus, X); // claim de B: este SÍ cruza hacia A
    await vi.advanceTimersByTimeAsync(150); // drenar microtasks + timeouts
    const ua = a.state.resolved.at(-1);
    const ub = b.state.resolved.at(-1);
    expect(ua).not.toBe(ub); // jamás comparten
    expect([ua, ub].filter((u) => u === X)).toHaveLength(1); // una conserva, una acuña
    expect(a.state.written.length + b.state.written.length).toBe(1); // exactamente un mint
  });

  it('mine TARDÍO tras el timeout: la copia se recupera acuñando uno nuevo', async () => {
    const bus = new PumpBus();
    // Original: resuelve X por timeout (su claim no tiene destinatarios aún).
    const o = await newPage(bus, X);
    await vi.advanceTimersByTimeAsync(150);
    expect(o.state.resolved).toEqual([X]);

    // Copia: su claim queda retenido (hilo bloqueado del otro lado) y su
    // timeout resuelve X — el uuid queda compartido un instante…
    const c = await newPage(bus, X);
    await vi.advanceTimersByTimeAsync(150);
    expect(c.state.resolved).toEqual([X]);
    expect(c.state.written).toHaveLength(0);

    // …hasta que el claim llega tarde y la original (viva) responde 'mine'.
    bus.pump(); // claim de C → O; O defiende y responde 'mine'
    bus.pump(); // 'mine' → C: recuperación tardía
    expect(c.state.resolved).toEqual([X, expect.any(String)]);
    expect(c.state.resolved[1]).not.toBe(X);
    expect(c.state.written).toEqual([c.state.resolved[1]]);
    expect(c.getStored()).toBe(c.state.resolved[1]); // persistió el renovado
    expect(o.state.resolved).toEqual([X]); // la original conserva el suyo
  });

  it('un resolve posterior por OTRO uuid neutraliza el handshake abandonado', async () => {
    // Contrato del singleton: si la página re-resuelve por un uuid distinto
    // mientras un handshake está en vuelo, el timer del viejo NO puede
    // notificar el uuid abandonado (sería un uuid rancio para el submit).
    const bus = new FakeBus();
    const Y = '99999999-8888-7777-6666-555555555555';
    vi.resetModules();
    const mod = await import('../src/lib/tabUuid');
    const resolved = [];
    const io = (stored) => ({
      read: () => stored,
      write: () => {},
      onResolved: (u) => resolved.push(u),
      channel: () => bus.join(),
    });
    mod.resolveTabUuid(io(X)); // handshake por X en vuelo (nadie responde)
    mod.resolveTabUuid(io(Y)); // la página pasó a preguntar por Y
    await vi.advanceTimersByTimeAsync(150);
    // Solo resuelve el handshake vigente; el timer rancio de X calló.
    expect(resolved).toEqual([Y]);
  });
});

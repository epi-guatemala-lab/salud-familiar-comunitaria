// Resolución del uuid idempotente de la encuesta PARA ESTA PESTAÑA.
//
// sessionStorage se COPIA cuando se duplica una pestaña o se abre un enlace
// con opener: la pestaña nueva heredaría el uuid de la original y el backend
// (dedup por uuid) devolvería 201 con el registro de la primera — la segunda
// encuesta se perdería con un falso «enviada». Para distinguir «recarga de
// esta pestaña» (hay que CONSERVAR el uuid) de «copia heredada» (hay que
// renovarlo) se hace un handshake por BroadcastChannel: quien carga pregunta
// quién posee el uuid almacenado; si otra pestaña viva lo posee, esta es una
// copia y acuña uno nuevo. Si nadie responde a tiempo (la pestaña original
// ya se cerró, o es esta misma tras un reload) el uuid se conserva, que es
// la idempotencia que la recarga necesita.
//
// El estado es un SINGLETON a nivel de módulo (una página = un canal):
// - el canal permanece abierto toda la vida de la página, para defender el
//   uuid de claims posteriores;
// - la defensa mira el uuid VIGENTE (currentUuid), no el del cierre inicial;
// - CONTENCIÓN SIMULTÁNEA (dos pestañas restauradas a la vez con el mismo
//   uuid heredado, ninguna dueña): quien reclama con el `from` MENOR gana el
//   uuid y la otra acuña — desempate simétrico y determinista, sin reloj;
// - `mine` TARDÍO (la original estaba con el hilo bloqueado y responde
//   después del timeout): se acuña uno nuevo y se re-notifica; si el envío
//   ya salió con el uuid viejo no hay pérdida adicional (el registro ya
//   viajó), y si no ha salido, el submit usará el renovado;
// - un segundo resolveTabUuid mientras hay handshake en vuelo para el mismo
//   uuid (remount del componente) se adhiere al handshake existente; si es
//   por OTRO uuid, lo reemplaza y el timer abandonado queda neutralizado.
import { v4 as uuidv4 } from 'uuid';

export const TAB_UUID_CHANNEL = 'sfyc_encuesta_tab_uuid';
export const TAB_UUID_HANDSHAKE_MS = 150;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let bc = null;
let me = null;
let currentUuid = null; // uuid que esta página posee y defiende
let pending = null; // handshake en vuelo: { uuid, subs, settled, timer }
let persist = () => {}; // write del último resolveTabUuid
let notifyResolved = () => {}; // onResolved del último resolveTabUuid

function mintFresh() {
  const fresh = uuidv4();
  persist(fresh); // persistir: un reload de esta pestaña reutiliza, no acuña otro
  currentUuid = fresh;
  notifyResolved(fresh);
  return fresh;
}

function settlePending(outcome) {
  if (!pending || pending.settled) return;
  const subs = pending.subs;
  pending.settled = true;
  clearTimeout(pending.timer);
  pending = null;
  subs.forEach((cb) => cb(outcome));
}

function ensureChannel(makeChannel) {
  if (bc !== null) return bc;
  try {
    bc = makeChannel();
  } catch {
    bc = null;
    return null;
  }
  if (!bc) return null;
  me = uuidv4(); // identidad de ESTA página (distinta en cada pestaña)
  bc.onmessage = (ev) => {
    const d = ev?.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'claim' && d.from !== me) {
      const contending = pending && !pending.settled && d.uuid === pending.uuid;
      if (contending && d.from < me) {
        // Contención simultánea por un uuid sin dueño (p. ej. dos pestañas
        // restauradas a la vez): gana el from menor, desempate simétrico.
        settlePending('conflict');
        return;
      }
      if (contending || d.uuid === currentUuid) {
        // Este uuid es (o será) nuestro: defenderlo para que la otra pestaña
        // acuñe el suyo. En contención con from mayor, también gana este lado.
        bc.postMessage({ type: 'mine', uuid: d.uuid, to: d.from });
      }
      return;
    }
    if (d.type === 'mine' && d.to === me) {
      if (pending && !pending.settled && d.uuid === pending.uuid) {
        // Una pestaña original viva posee el uuid reclamado: copia heredada.
        settlePending('conflict');
        return;
      }
      if (!pending && d.uuid === currentUuid) {
        // 'mine' TARDÍO: resolvimos por timeout, pero la original viva (hilo
        // bloqueado >150 ms) recién contesta. Recuperarse acuñando uno nuevo;
        // si el envío ya salió con el viejo, no hay pérdida adicional.
        mintFresh();
      }
    }
  };
  return bc;
}

/**
 * Resuelve el uuid de esta pestaña. onResolved se llama una vez con el uuid
 * final, y PUEDE volver a llamarse (con un uuid renovado) si llega un
 * conflicto tardío — los consumidores deben actualizar su estado en cada
 * llamada. Todo el I/O va inyectado para testear el protocolo sin navegador.
 *
 * @param {object} io
 * @param {() => string|null} io.read        lee el uuid persistido de la pestaña
 * @param {(uuid: string) => void} io.write  persiste un uuid nuevo
 * @param {(uuid: string) => void} io.onResolved uuid vigente (cada vez que cambie)
 * @param {() => BroadcastChannel|null} [io.channel] fábrica del canal; si falta
 *        usa el BroadcastChannel real, y si no existe conserva el almacenado.
 */
export function resolveTabUuid(io = {}) {
  const read = io.read ?? (() => null);
  const makeChannel =
    'channel' in io
      ? io.channel
      : () => (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(TAB_UUID_CHANNEL) : null);
  persist = io.write ?? (() => {});
  notifyResolved = io.onResolved ?? (() => {});

  const stored = read();
  const finish = (u) => {
    currentUuid = u;
    notifyResolved(u);
  };

  if (!stored || !UUID_RE.test(stored)) {
    mintFresh();
    return;
  }

  const channel = ensureChannel(makeChannel);
  if (!channel) {
    // Sin BroadcastChannel no hay forma de distinguir copia de recarga:
    // conservar el almacenado (idempotencia de reload intacta).
    finish(stored);
    return;
  }

  const outcome = (what) => (what === 'conflict' ? mintFresh() : finish(stored));

  if (pending && !pending.settled && pending.uuid === stored) {
    // Ya hay un handshake en vuelo para este mismo uuid (remount): adherirse.
    pending.subs.push(outcome);
    return;
  }

  const subs = [outcome];
  const timer = setTimeout(() => {
    // Si un resolve posterior por OTRO uuid reemplazó este handshake, el
    // timer es rancio: no debe notificar el uuid abandonado (quien esperaba
    // ese handshake se queda sin uuid — fail-safe — en vez de recibir uno
    // que ya no es el vigente de esta página).
    if (pending && !pending.settled && pending.timer === timer) {
      pending.settled = true;
      pending = null;
      subs.forEach((cb) => cb('timeout'));
    }
  }, TAB_UUID_HANDSHAKE_MS);
  pending = { uuid: stored, subs, settled: false, timer };
  channel.postMessage({ type: 'claim', uuid: stored, from: me });
}

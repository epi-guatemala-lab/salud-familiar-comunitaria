// src/lib/anticheat-pow.js
//
// Proof-of-work cliente: encuentra un nonce N tal que
//   sha256(seed + ":" + N)
// tenga al menos `difficulty` ceros hexadecimales como prefijo.
//
// El servidor (doc 02 §C.18) define la dificultad por modo:
//   LAXO/NORMAL: 0 (deshabilitado)
//   NORMAL+:     3-4   (~50ms en CPU normal)
//   ESTRICTO:    4-5   (~5s para bots, <1s para humanos)
//
// La función cede el hilo cada N iteraciones para no bloquear la UI.

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hasLeadingHexZeros(hex, count) {
  if (count <= 0) return true;
  for (let i = 0; i < count; i += 1) {
    if (hex[i] !== '0') return false;
  }
  return true;
}

function yieldFrame() {
  // Usa requestAnimationFrame si existe; fallback a setTimeout(0).
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Resuelve el PoW. Devuelve el nonce como string para enviar al backend.
 * Si la dificultad es 0 o falsy, devuelve null inmediatamente.
 *
 * @param {string} seed     — challenge string del backend
 * @param {number} difficulty — número de ceros hex requeridos (0..8)
 * @param {object} opts
 * @param {AbortSignal} [opts.signal] — para cancelar (timeout/unmount)
 * @param {number}     [opts.maxIterations=5_000_000]
 */
export async function solvePoW(seed, difficulty, opts = {}) {
  if (!difficulty || difficulty <= 0) return null;
  const { signal, maxIterations = 5_000_000 } = opts;
  let nonce = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) {
      throw new Error('PoW cancelado');
    }
    if (nonce > maxIterations) {
      throw new Error(`PoW excedió ${maxIterations} iteraciones (dificultad ${difficulty} demasiado alta)`);
    }
    // eslint-disable-next-line no-await-in-loop
    const hash = await sha256Hex(`${seed}:${nonce}`);
    if (hasLeadingHexZeros(hash, difficulty)) {
      return String(nonce);
    }
    nonce += 1;
    if (nonce % 1000 === 0) {
      // Cede el hilo periódicamente para no bloquear paint.
      // eslint-disable-next-line no-await-in-loop
      await yieldFrame();
    }
  }
}

export default solvePoW;

// SHA256 helper con Web Crypto. Usado para fingerprint hashing en login (cuando aplique).
// En contextos no-crypto (older browsers / file://), retorna fallback djb2 hex.

export async function sha256(input) {
  if (input === null || input === undefined) input = '';
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buf = new TextEncoder().encode(text);
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      /* fallthrough */
    }
  }
  return djb2Hex(text);
}

export function djb2Hex(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  // Pad to 16 hex chars (no es seguridad, solo identificador local).
  return ('0'.repeat(16) + (h >>> 0).toString(16)).slice(-16);
}

export function randomId(len = 12) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, len);
  }
  return Math.random().toString(36).slice(2, 2 + len);
}

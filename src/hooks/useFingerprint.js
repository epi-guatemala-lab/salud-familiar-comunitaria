// src/hooks/useFingerprint.js
//
// Genera un fingerprint compuesto del dispositivo/navegador para
// vincular sesión + intento de examen (anti-cheat C.20 + session
// binding C.11).
//
// Devuelve un objeto con:
//   - .canvas / .webgl / .audio / .screen / .tz / .lang / .plugins / .headless
//   - ._hash      → hash SHA-256 corto (string hex) que sirve como
//                   identificador estable cliente-side
//   - .toString() → mismo hash (compatible con `${fingerprint}`)
//   - .toJSON()   → payload completo serializable
//
// USO en componentes:
//   const fingerprint = useFingerprint();
//   const fp = await fingerprint.toString();   // hash
//   const full = fingerprint.toJSON();         // payload completo
//
// La función `generateFingerprint()` es exportada por separado para
// uso fuera de React (por ejemplo, dentro de funciones async como en
// ExamenLanding).

import { useEffect, useState, useMemo } from 'react';

// ----------------------------------------------------------------------
// SHA-256 helper (hex, primeros 32 chars para mantenerlo corto)
// ----------------------------------------------------------------------
async function sha256Hex(input) {
  try {
    const enc = new TextEncoder().encode(String(input));
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    // Fallback inseguro: solo en navegadores muy antiguos sin SubtleCrypto.
    let h = 0;
    const s = String(input);
    for (let i = 0; i < s.length; i += 1) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
}

// ----------------------------------------------------------------------
// Sub-fingerprints
// ----------------------------------------------------------------------
async function canvasFingerprint() {
  try {
    const c = document.createElement('canvas');
    c.width = 280;
    c.height = 60;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('IGSS-SFyC ✓ 2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('IGSS-SFyC ✓ 2026', 4, 17);
    return await sha256Hex(c.toDataURL());
  } catch {
    return 'canvas:unavailable';
  }
}

async function webglFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'webgl:none';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return await sha256Hex(`${vendor};${renderer};${gl.getParameter(gl.VERSION)}`);
  } catch {
    return 'webgl:err';
  }
}

async function audioFingerprint() {
  try {
    const Ctor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctor) return 'audio:none';
    const ctx = new Ctor(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.frequency.value = 1000;
    const compressor = ctx.createDynamicsCompressor();
    osc.connect(compressor);
    compressor.connect(ctx.destination);
    osc.start();
    // No esperamos a que termine (puede colgar) — basta con metadata.
    const meta = JSON.stringify({
      sr: ctx.sampleRate,
      base: ctx.baseLatency || 0,
      ch: ctx.destination.channelCount,
    });
    try {
      ctx.close?.();
    } catch {
      /* ignore */
    }
    return await sha256Hex(meta);
  } catch {
    return 'audio:err';
  }
}

function screenString() {
  try {
    return `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}-cd${screen.colorDepth || 0}`;
  } catch {
    return 'screen:err';
  }
}

function timezoneString() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'tz:err';
  }
}

function languageString() {
  try {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || 'en'];
    return langs.join(',');
  } catch {
    return 'lang:err';
  }
}

function pluginsString() {
  try {
    if (!navigator.plugins || !navigator.plugins.length) return 'plugins:none';
    return Array.from(navigator.plugins, (p) => p.name).join(',');
  } catch {
    return 'plugins:err';
  }
}

function detectHeadless() {
  try {
    const ua = navigator.userAgent || '';
    return Boolean(
      navigator.webdriver ||
        /HeadlessChrome|PhantomJS|Puppeteer|Selenium/i.test(ua) ||
        // Algunos drivers fuerzan window.chrome a undefined en Chrome real.
        (window.outerHeight === 0 && window.outerWidth === 0)
    );
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------
// generateFingerprint(): función standalone (puede usarse sin React)
// ----------------------------------------------------------------------
export async function generateFingerprint() {
  const [canvas, webgl, audio] = await Promise.all([
    canvasFingerprint(),
    webglFingerprint(),
    audioFingerprint(),
  ]);
  const screenFp = screenString();
  const tz = timezoneString();
  const lang = languageString();
  const plugins = pluginsString();
  const headless = detectHeadless();
  const _hash = await sha256Hex([canvas, webgl, audio, screenFp, tz, lang].join('|'));

  const payload = {
    canvas,
    webgl,
    audio,
    screen: screenFp,
    tz,
    lang,
    plugins,
    headless,
    _hash,
    ua: navigator.userAgent || '',
    platform: navigator.platform || '',
    cpus: navigator.hardwareConcurrency || 0,
    memory: navigator.deviceMemory || 0,
    touch: typeof window !== 'undefined' && 'ontouchstart' in window,
  };

  return {
    ...payload,
    toString() {
      return _hash;
    },
    toJSON() {
      // Excluye `toString`/`toJSON` automáticamente en JSON.stringify.
      return payload;
    },
  };
}

// ----------------------------------------------------------------------
// Hook React: cachea el fingerprint para no recalcularlo en cada render
// ----------------------------------------------------------------------
export function useFingerprint() {
  const [fp, setFp] = useState(null);

  useEffect(() => {
    let alive = true;
    generateFingerprint().then((value) => {
      if (alive) setFp(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Mientras carga devolvemos un objeto "vacío" con .toString() async-aware
  // — los consumidores deben hacer `await fp.toString()`.
  return useMemo(() => {
    if (fp) return fp;
    return {
      canvas: null,
      webgl: null,
      audio: null,
      _hash: null,
      async toString() {
        const real = await generateFingerprint();
        return real._hash;
      },
      toJSON() {
        return { _pending: true };
      },
    };
  }, [fp]);
}

export default useFingerprint;

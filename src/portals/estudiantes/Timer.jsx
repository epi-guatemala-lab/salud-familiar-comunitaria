// src/portals/estudiantes/Timer.jsx
//
// Countdown reactivo basado en `endsAt` (ISO timestamp del backend).
// Recalcula cada 1 segundo. Cambia a rojo en los últimos 5 minutos
// y dispara `onExpire()` cuando llega a 0.
//
// IMPORTANTE: este timer es solo informativo. El backend es la fuente
// autoritativa del deadline (doc 02 §C.12). Si el reloj cliente está
// desincronizado, el server force-submit corregirá.

import { useEffect, useRef, useState } from 'react';

function fmt(seconds) {
  if (seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Timer({ endsAt, onExpire, serverNow }) {
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : null;
  // Delta entre reloj cliente y servidor (si nos lo dieron); 0 si no.
  const deltaRef = useRef(serverNow ? Date.now() - new Date(serverNow).getTime() : 0);

  const computeRemaining = () => {
    if (!endsAtMs) return 0;
    const nowMs = Date.now() - deltaRef.current;
    return Math.max(0, Math.floor((endsAtMs - nowMs) / 1000));
  };

  const [remaining, setRemaining] = useState(computeRemaining);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(computeRemaining());
    const id = setInterval(() => {
      const r = computeRemaining();
      setRemaining(r);
      if (r === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, serverNow]);

  const danger = remaining > 0 && remaining <= 300; // últimos 5 min
  const expired = remaining === 0;

  return (
    <div
      className={`px-3 py-1 rounded font-mono text-sm flex items-center gap-1 transition-colors ${
        expired
          ? 'bg-sfyc-rojo text-white'
          : danger
          ? 'bg-sfyc-amarillo text-igss-900 animate-pulse'
          : 'bg-igss-900/30 text-white'
      }`}
      title={endsAt ? `Cierra: ${new Date(endsAt).toLocaleString('es-GT')}` : ''}
      aria-label={`Tiempo restante: ${fmt(remaining)}`}
    >
      <span aria-hidden="true">⏱️</span>
      <span>{fmt(remaining)}</span>
    </div>
  );
}

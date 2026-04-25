// src/portals/estudiantes/Watermark.jsx
//
// Overlay fullscreen con `pointer-events: none` que repite el texto
// identificativo del estudiante en diagonal sobre toda la pantalla.
// Anti-cheat C.05: si filtran un screenshot, el texto delata al estudiante.
//
// Notas:
//   - z-index alto pero NO bloquea clicks (pointer-events:none).
//   - mix-blend-multiply para que sea legible sobre fondo claro u oscuro.
//   - Se actualiza la hora cada 30s para que cada captura sea trazable.

import { useEffect, useState, memo } from 'react';

const REPETICIONES = 30;

function WatermarkRaw({ text, nombre, dpi, intentoId, token }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Si nos dieron `text` ya armado (firma legacy), usarlo. Sino, componer.
  const fechaHora = now.toLocaleString('es-GT', { hour12: false });
  const composed =
    text ||
    [
      nombre || 'Estudiante',
      dpi ? `DPI ${dpi}` : null,
      fechaHora,
      intentoId ? `#${intentoId}` : null,
      token ? `T-${String(token).slice(0, 8)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden mix-blend-multiply animate-watermark-rotate"
      style={{ opacity: 0.07 }}
      data-testid="watermark"
    >
      {Array.from({ length: REPETICIONES }).map((_, i) => (
        <div
          key={i}
          className="absolute origin-top-left whitespace-nowrap text-xs font-mono text-igss-900"
          style={{
            transform: `rotate(-25deg) translate(${(i % 6) * 360}px, ${Math.floor(i / 6) * 220}px)`,
            left: 0,
            top: 0,
          }}
        >
          {composed}
        </div>
      ))}
    </div>
  );
}

const Watermark = memo(WatermarkRaw);
export default Watermark;

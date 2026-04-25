// src/portals/estudiantes/StrikesIndicator.jsx
//
// Pequeño widget de header que muestra strikes acumulados / máx
// y opcionalmente el suspicion_score actual.

export default function StrikesIndicator({ current = 0, max = 3, score }) {
  const ratio = max > 0 ? current / max : 0;
  const tone =
    ratio >= 1
      ? 'bg-sfyc-rojo'
      : ratio >= 0.6
      ? 'bg-sfyc-amarillo text-igss-900'
      : 'bg-igss-900/30';

  return (
    <div
      className={`px-3 py-1 rounded text-sm font-semibold text-white flex items-center gap-2 ${tone}`}
      aria-label={`Strikes: ${current} de ${max}`}
      title={
        typeof score === 'number'
          ? `Score de sospecha: ${score.toFixed(1)}`
          : 'Cuenta de incidentes registrados'
      }
    >
      <span aria-hidden="true">⚠️</span>
      <span>
        {current}/{max}
      </span>
      {typeof score === 'number' && score > 0 && (
        <span className="opacity-80 text-xs">({score.toFixed(0)})</span>
      )}
    </div>
  );
}

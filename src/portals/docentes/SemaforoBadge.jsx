import Tooltip from '../../components/ui/Tooltip';

/**
 * SemaforoBadge — badge color para suspicion_score de intentos de examen.
 *
 * Reglas:
 *   score < 5     → 🟢 OK
 *   5 <= s < 10   → 🟡 BAJA
 *   10 <= s < 20  → 🟠 REVISAR
 *   s >= 20       → 🔴 ALTA
 */
export default function SemaforoBadge({ score, showScore = true }) {
  const s = Number(score);
  let nivel;
  if (Number.isNaN(s) || score == null) nivel = 'NA';
  else if (s < 5) nivel = 'VERDE';
  else if (s < 10) nivel = 'AMARILLO';
  else if (s < 20) nivel = 'NARANJA';
  else nivel = 'ROJO';

  const cfg = {
    VERDE: {
      icon: '🟢',
      label: 'OK',
      tooltip: 'Sin indicios de comportamiento sospechoso',
      classes: 'bg-green-100 text-green-800 border-green-300',
    },
    AMARILLO: {
      icon: '🟡',
      label: 'Baja',
      tooltip: 'Algunas alertas menores; revisar opcional',
      classes: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    NARANJA: {
      icon: '🟠',
      label: 'Revisar',
      tooltip: 'Patrón sospechoso — se recomienda revisar timeline',
      classes: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    ROJO: {
      icon: '🔴',
      label: 'Alta',
      tooltip: 'Múltiples incidentes — sospecha alta de violación de integridad',
      classes: 'bg-red-100 text-red-800 border-red-300',
    },
    NA: {
      icon: '⚪',
      label: 'N/A',
      tooltip: 'Sin datos de integridad disponibles',
      classes: 'bg-gray-100 text-gray-600 border-gray-300',
    },
  }[nivel];

  const badge = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.classes}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      <span>{cfg.label}</span>
      {showScore && !Number.isNaN(s) && score != null && (
        <span className="opacity-70">({s.toFixed(1)})</span>
      )}
    </span>
  );

  return Tooltip ? <Tooltip text={cfg.tooltip}>{badge}</Tooltip> : badge;
}

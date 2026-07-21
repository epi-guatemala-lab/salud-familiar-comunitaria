import { Link } from 'react-router-dom';
import Badge from '../../../components/ui/Badge';
import { fmtDateTime } from '../../../lib/format';
import {
  activityId,
  activityStart,
  activityTitle,
  DATE_PRECISION_LABELS,
} from '../model';
import StatusBadge from './StatusBadge';

export default function ActivityCard({ activity, compact = false }) {
  const id = activityId(activity);
  const missing = activity.missing_fields || [];
  const start = activityStart(activity);
  const dateLabel = start
    ? fmtDateTime(start)
    : activity.fecha_texto_original
      ? `${activity.fecha_texto_original} · ${DATE_PRECISION_LABELS[activity.precision_fecha] || 'Fecha histórica'}`
      : 'Sin fecha';
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-igss-300 hover:shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={activity.estado_programacion} />
            <StatusBadge value={activity.estado_documentacion} kind="document" />
            {activity.legacy_import && <Badge tone="outline">Histórica</Badge>}
          </div>
          <h3 className="mt-2 text-base font-bold text-igss-900 sm:text-lg">
            <Link
              to={`/bitacora/actividades/${id}`}
              className="rounded hover:underline focus-visible:ring-2 focus-visible:ring-igss-500"
            >
              {activityTitle(activity)}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {dateLabel}
            {activity.unidad_lugar ? ` · ${activity.unidad_lugar}` : ''}
          </p>
          {!compact && activity.objetivo && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-700">{activity.objetivo}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {missing.length > 0 && (
            <span className="text-xs font-semibold text-red-700">
              {missing.length} faltante{missing.length === 1 ? '' : 's'}
            </span>
          )}
          <Link
            to={`/bitacora/actividades/${id}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-igss-300 px-3 text-sm font-semibold text-igss-800 hover:bg-igss-50"
            aria-label={`Abrir ${activityTitle(activity)}`}
          >
            Abrir
          </Link>
        </div>
      </div>
    </article>
  );
}

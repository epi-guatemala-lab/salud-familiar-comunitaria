import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { bitacoraApi } from '../api';
import { hasBitacoraCapability, isBitacoraSecretary } from '../../../lib/permissions';
import { activityStart, statusCount } from '../model';
import { useRemote } from '../useRemote';
import ActivityCard from '../components/ActivityCard';
import { ErrorState, LoadingState } from '../components/AsyncState';

const CARD_CONFIG = [
  { key: 'hoy', label: 'Hoy', icon: '◷', query: 'fecha=hoy', tone: 'border-blue-500 bg-blue-50' },
  { key: 'proximas', label: 'Próximas', icon: '→', query: 'fecha=proximas', tone: 'border-igss-500 bg-igss-50' },
  { key: 'pendientes', label: 'Pendientes', icon: '!', query: 'completitud=incompleta', tone: 'border-yellow-500 bg-yellow-50' },
  { key: 'devueltas', label: 'Devueltas', icon: '↶', query: 'estado_documentacion=REQUIERE_CORRECCION', tone: 'border-red-500 bg-red-50' },
  { key: 'control', label: 'Pendientes de control', icon: '✓', query: 'estado_documentacion=ENVIADA', tone: 'border-purple-500 bg-purple-50', secretary: true },
  { key: 'acuerdos_vencidos', label: 'Acuerdos vencidos', icon: '⌛', query: 'acuerdos=vencidos', tone: 'border-orange-500 bg-orange-50' },
];

function listFrom(data, ...keys) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.[key]?.items)) return data[key].items;
  }
  return [];
}

export function chronological(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(activityStart(left) || 0).getTime();
    const rightTime = new Date(activityStart(right) || 0).getTime();
    return leftTime - rightTime;
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const secretary = isBitacoraSecretary(user);
  const canCreate = hasBitacoraCapability(user, 'create');
  const loader = useCallback(async () => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const todayStart = `${today}T06:00:00.000Z`;
    const [summary, upcoming, returned] = await Promise.all([
      bitacoraApi.dashboard(),
      bitacoraApi.listActivities({ fecha_desde: todayStart, estado_programacion: 'PROGRAMADA', orden: 'asc', page: 1, limit: 5 }),
      bitacoraApi.listActivities({ estado_documentacion: 'REQUIERE_CORRECCION', page: 1, limit: 5 }),
    ]);
    return {
      ...summary,
      actividades_proximas: chronological(upcoming.items || []),
      actividades_devueltas: returned.items || [],
      _today: today,
    };
  }, []);
  const { data, loading, error, reload } = useRemote(loader);

  if (loading && !data) return <LoadingState label="Preparando el resumen…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const root = data?.resumen || data || {};
  const cards = CARD_CONFIG.filter((card) => !card.secretary || secretary);
  const upcoming = listFrom(data, 'actividades_proximas', 'proximas_actividades', 'proximas');
  const returned = listFrom(data, 'actividades_devueltas', 'devueltas_actividades', 'devueltas');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-igss-900 sm:text-3xl">Bitácora de actividades</h1>
          <p className="mt-1 text-sm text-gray-600">
            Agenda institucional, documentación y seguimiento de acuerdos.
          </p>
        </div>
        {canCreate && <Link
          to="/bitacora/actividades/nueva"
          className="inline-flex min-h-11 items-center rounded-lg bg-igss-700 px-4 font-bold text-white shadow-sm hover:bg-igss-800"
        >
          + Nueva actividad
        </Link>}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumen de pendientes">
        {cards.map((card) => {
          const count = statusCount(
            root,
            card.key,
            `total_${card.key}`,
            `${card.key}_total`,
            card.key === 'control' ? 'pendientes_control' : card.key
          );
          let destination = `/bitacora/actividades?${card.query}`;
          if (card.key === 'control') destination = '/bitacora/control';
          if (card.key === 'hoy') destination = `/bitacora/actividades?fecha_desde=${root._today}&fecha_hasta=${root._today}`;
          if (card.key === 'proximas') destination = `/bitacora/actividades?fecha_desde=${root._today}&estado_programacion=PROGRAMADA`;
          return (
            <Link
              key={card.key}
              to={destination}
              className={`group min-h-28 rounded-xl border-l-4 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${card.tone}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-gray-800">{card.label}</span>
                <span className="text-xl" aria-hidden="true">{card.icon}</span>
              </div>
              <strong className="mt-2 block text-3xl text-gray-950">{count}</strong>
              <span className="mt-1 block text-xs font-semibold text-gray-600 group-hover:underline">Ver detalle</span>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="upcoming-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="upcoming-title" className="text-lg font-bold text-igss-900">Próximas actividades</h2>
            <Link to="/bitacora/calendario" className="text-sm font-semibold text-igss-700 hover:underline">Calendario</Link>
          </div>
          <div className="space-y-3">
            {upcoming.length > 0 ? upcoming.slice(0, 5).map((item) => (
              <ActivityCard key={item.id || item.actividad_id} activity={item} compact />
            )) : (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
                No hay próximas actividades en el período.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="returned-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="returned-title" className="text-lg font-bold text-igss-900">Devueltas para corrección</h2>
            <Link to="/bitacora/actividades?estado_documentacion=REQUIERE_CORRECCION" className="text-sm font-semibold text-igss-700 hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {returned.length > 0 ? returned.slice(0, 5).map((item) => (
              <ActivityCard key={item.id || item.actividad_id} activity={item} compact />
            )) : (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
                No hay documentos devueltos.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

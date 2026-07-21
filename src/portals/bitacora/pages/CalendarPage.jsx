import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { useDebounce } from '../../../hooks/useDebounce';
import { fmtDateTime } from '../../../lib/format';
import { bitacoraApi } from '../api';
import { activityStart, activityTitle, dateBoundaryUtc, GT_TIME_ZONE, normalizePaginated } from '../model';
import { useRemote } from '../useRemote';
import ActivityCard from '../components/ActivityCard';
import ActivityFilters, { EMPTY_FILTERS } from '../components/ActivityFilters';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';
import StatusBadge from '../components/StatusBadge';

const VIEWS = [
  ['month', 'Mes'],
  ['week', 'Semana'],
  ['day', 'Día'],
  ['agenda', 'Agenda'],
];

function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: GT_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function keyDate(key) {
  return new Date(`${key}T12:00:00Z`);
}

function keyFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(key, days) {
  const date = keyDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return keyFromDate(date);
}

function addMonths(key, months) {
  const date = keyDate(key);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const max = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, max));
  return keyFromDate(date);
}

function weekStart(key) {
  const day = keyDate(key).getUTCDay();
  return addDays(key, -(day === 0 ? 6 : day - 1));
}

function viewRange(focus, view) {
  if (view === 'day') return { start: focus, end: focus };
  if (view === 'week') {
    const start = weekStart(focus);
    return { start, end: addDays(start, 6) };
  }
  if (view === 'agenda') return { start: focus, end: addDays(focus, 30) };
  const date = keyDate(focus);
  const first = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const start = weekStart(first);
  return { start, end: addDays(start, 41) };
}

function longDate(key, options) {
  return new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', ...options }).format(keyDate(key));
}

function heading(focus, view, range) {
  if (view === 'month') return longDate(focus, { month: 'long', year: 'numeric' });
  if (view === 'day') return longDate(focus, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${longDate(range.start, { day: 'numeric', month: 'short' })} – ${longDate(range.end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function moveFocus(focus, view, direction) {
  if (view === 'month') return addMonths(focus, direction);
  if (view === 'week') return addDays(focus, direction * 7);
  return addDays(focus, direction * (view === 'agenda' ? 30 : 1));
}

function byDate(items) {
  return items.reduce((groups, activity) => {
    const key = dateKey(activityStart(activity));
    if (!key) return groups;
    groups[key] = [...(groups[key] || []), activity];
    return groups;
  }, {});
}

function DayList({ day, items, detailed = true }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-bold capitalize text-igss-900">
        {longDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Sin actividades.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((activity) => detailed ? (
            <ActivityCard key={activity.id || activity.actividad_id} activity={activity} compact />
          ) : (
            <Link
              key={activity.id || activity.actividad_id}
              to={`/bitacora/actividades/${activity.id || activity.actividad_id}`}
              className="block min-h-11 rounded-lg border border-gray-200 p-2 text-sm hover:border-igss-300 hover:bg-igss-50"
            >
              <strong className="block text-gray-900">{activityTitle(activity)}</strong>
              <span className="text-xs text-gray-600">{fmtDateTime(activityStart(activity))}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState('month');
  const [focus, setFocus] = useState(() => dateKey());
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const debounced = useDebounce(filters, 350);
  const range = useMemo(() => viewRange(focus, view), [focus, view]);
  const queryKey = JSON.stringify(debounced);
  const loader = useCallback(
    async () => {
      const nonDateFilters = Object.fromEntries(
        Object.entries(debounced).filter(([key]) => !['fecha_desde', 'fecha_hasta'].includes(key))
      );
      const common = {
        ...nonDateFilters,
        fecha_desde: dateBoundaryUtc(debounced.fecha_desde || range.start),
        fecha_hasta: dateBoundaryUtc(debounced.fecha_hasta || range.end, true),
        page: 1,
        limit: 500,
      };
      const [dated, undated] = await Promise.all([
        bitacoraApi.listActivities(common),
        bitacoraApi.listActivities({ ...nonDateFilters, sin_fecha: true, page: 1, limit: 100 }),
      ]);
      return { dated: normalizePaginated(dated), undated: normalizePaginated(undated) };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey, range.start, range.end]
  );
  const { data, loading, error, reload } = useRemote(loader);
  const grouped = useMemo(() => byDate(data?.dated?.items || []), [data]);
  const days = useMemo(() => {
    const values = [];
    for (let key = range.start; key <= range.end; key = addDays(key, 1)) values.push(key);
    return values;
  }, [range.end, range.start]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-igss-900">Calendario global</h1>
        <p className="mt-1 text-sm text-gray-600">Todas las fechas se muestran en America/Guatemala (UTC−6).</p>
      </div>

      <ActivityFilters value={filters} onChange={setFilters} onReset={() => setFilters({ ...EMPTY_FILTERS })} />

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Calendario de actividades">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-3">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="min-h-11 min-w-11" aria-label="Período anterior" onClick={() => setFocus((value) => moveFocus(value, view, -1))}>‹</Button>
            <Button variant="secondary" size="sm" className="min-h-11" onClick={() => setFocus(dateKey())}>Hoy</Button>
            <Button variant="secondary" size="sm" className="min-h-11 min-w-11" aria-label="Período siguiente" onClick={() => setFocus((value) => moveFocus(value, view, 1))}>›</Button>
          </div>
          <h2 className="text-center text-lg font-bold capitalize text-igss-900">{heading(focus, view, range)}</h2>
          <div className="flex flex-wrap rounded-lg border border-gray-300 p-1" role="group" aria-label="Vista del calendario">
            {VIEWS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`min-h-11 rounded-md px-3 text-sm font-semibold ${view === key ? 'bg-igss-700 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? <LoadingState label="Cargando calendario…" /> : null}
        {error && !data ? <div className="p-4"><ErrorState error={error} onRetry={reload} /></div> : null}

        {data && view === 'month' && (
          <div className="overflow-x-auto" aria-busy={loading}>
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-bold uppercase text-gray-600">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((name) => <div key={name} className="p-2">{name}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const items = grouped[day] || [];
                  const currentMonth = day.slice(0, 7) === focus.slice(0, 7);
                  return (
                    <div key={day} className={`min-h-36 border-b border-r border-gray-200 p-2 ${currentMonth ? 'bg-white' : 'bg-gray-50'}`}>
                      <button
                        type="button"
                        className={`grid min-h-11 min-w-11 place-items-center rounded-full text-sm font-bold ${day === dateKey() ? 'bg-igss-700 text-white' : currentMonth ? 'text-gray-900 hover:bg-igss-50' : 'text-gray-400'}`}
                        aria-label={`Ver día ${day}`}
                        onClick={() => { setFocus(day); setView('day'); }}
                      >
                        {Number(day.slice(-2))}
                      </button>
                      <div className="mt-1 space-y-1">
                        {items.slice(0, 3).map((activity) => (
                          <Link
                            key={activity.id || activity.actividad_id}
                            to={`/bitacora/actividades/${activity.id || activity.actividad_id}`}
                            className="block truncate rounded bg-igss-100 px-2 py-1 text-xs font-semibold text-igss-900 hover:bg-igss-200"
                            title={activityTitle(activity)}
                          >
                            {activityTitle(activity)}
                          </Link>
                        ))}
                        {items.length > 3 && <span className="block text-xs font-semibold text-gray-500">+ {items.length - 3} más</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {data && view === 'week' && (
          <div className="grid gap-3 p-3 lg:grid-cols-7" aria-busy={loading}>
            {days.map((day) => <DayList key={day} day={day} items={grouped[day] || []} detailed={false} />)}
          </div>
        )}

        {data && view === 'day' && <div className="p-4"><DayList day={focus} items={grouped[focus] || []} /></div>}

        {data && view === 'agenda' && (
          <div className="space-y-3 p-4" aria-busy={loading}>
            {(data.dated.items || []).length === 0 ? <EmptyState title="Sin actividades en el período" /> : days.filter((day) => grouped[day]?.length).map((day) => <DayList key={day} day={day} items={grouped[day]} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="undated-title">
        <div className="mb-3 flex items-center gap-2">
          <h2 id="undated-title" className="text-lg font-bold text-igss-900">Sin fecha</h2>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">{data?.undated?.total || 0}</span>
        </div>
        {(data?.undated?.items || []).length === 0 ? (
          <EmptyState title="No hay actividades sin fecha" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.undated.items.map((activity) => (
              <article key={activity.id || activity.actividad_id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap gap-2"><StatusBadge value={activity.estado_programacion} /><StatusBadge kind="document" value={activity.estado_documentacion} /></div>
                <Link to={`/bitacora/actividades/${activity.id || activity.actividad_id}`} className="mt-2 block min-h-11 font-bold text-igss-900 hover:underline">{activityTitle(activity)}</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export { addDays, dateKey, viewRange };

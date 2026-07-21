import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuth } from '../../../contexts/AuthContext';
import { hasBitacoraCapability } from '../../../lib/permissions';
import { bitacoraApi } from '../api';
import { dateBoundaryUtc, normalizePaginated } from '../model';
import { useRemote } from '../useRemote';
import ActivityCard from '../components/ActivityCard';
import ActivityFilters, { EMPTY_FILTERS } from '../components/ActivityFilters';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';

function filtersFromParams(searchParams) {
  const result = { ...EMPTY_FILTERS };
  Object.keys(result).forEach((key) => {
    if (searchParams.has(key)) result[key] = searchParams.get(key);
  });
  if (searchParams.get('fecha')) result.fecha = searchParams.get('fecha');
  if (searchParams.get('acuerdos')) result.acuerdos = searchParams.get('acuerdos');
  return result;
}

export default function ActivitiesPage() {
  const { user } = useAuth();
  const canCreate = hasBitacoraCapability(user, 'create');
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => filtersFromParams(searchParams));
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const debounced = useDebounce(filters, 350);
  const queryKey = JSON.stringify(debounced);

  const loader = useCallback(
    () => bitacoraApi.listActivities({
      ...debounced,
      fecha_desde: debounced.fecha_desde ? dateBoundaryUtc(debounced.fecha_desde) : undefined,
      fecha_hasta: debounced.fecha_hasta ? dateBoundaryUtc(debounced.fecha_hasta, true) : undefined,
      page,
      limit: 20,
    }),
    // `queryKey` representa el contenido estabilizado del objeto de filtros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey, page]
  );
  const { data, loading, error, reload } = useRemote(loader);
  const result = useMemo(() => normalizePaginated(data, { page, limit: 20 }), [data, page]);

  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(debounced).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [debounced, page, setSearchParams]);

  const changeFilters = (next) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-igss-900">Actividades</h1>
          <p className="mt-1 text-sm text-gray-600">Consulte tanto el archivo histórico como la agenda actual.</p>
        </div>
        {canCreate && <Link
          to="/bitacora/actividades/nueva"
          className="inline-flex min-h-11 items-center rounded-lg bg-igss-700 px-4 font-bold text-white hover:bg-igss-800"
        >
          + Nueva actividad
        </Link>}
      </div>

      <ActivityFilters
        value={filters}
        onChange={changeFilters}
        onReset={() => changeFilters({ ...EMPTY_FILTERS })}
      />

      {loading && !data ? <LoadingState /> : null}
      {error && !data ? <ErrorState error={error} onRetry={reload} /> : null}
      {data && (
        <section aria-live="polite" aria-busy={loading}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-gray-900">{result.total} resultado{result.total === 1 ? '' : 's'}</h2>
            {loading && <span className="text-xs text-gray-500">Actualizando…</span>}
          </div>
          {result.items.length === 0 ? (
            <EmptyState
              title="No hay actividades con estos filtros"
              action={<button type="button" className="min-h-11 rounded-lg px-4 font-semibold text-igss-700 hover:bg-igss-50" onClick={() => changeFilters({ ...EMPTY_FILTERS })}>Limpiar filtros</button>}
            >
              Pruebe un período más amplio o revise la bandeja Sin fecha en el calendario.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {result.items.map((activity) => (
                <ActivityCard key={activity.id || activity.actividad_id} activity={activity} />
              ))}
            </div>
          )}
          <div className="mt-5">
            <Pagination page={result.page} limit={result.limit} total={result.total} onPage={setPage} />
          </div>
        </section>
      )}
    </div>
  );
}

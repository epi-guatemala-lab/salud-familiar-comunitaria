import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { bitacoraApi } from '../api';
import { normalizePaginated } from '../model';
import { useRemote } from '../useRemote';
import ActivityCard from '../components/ActivityCard';
import WorkflowActions from '../components/WorkflowActions';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';

const PAGE_LIMIT = 20;

export default function ControlPage() {
  const { user } = useAuth();
  const [sentPage, setSentPage] = useState(1);
  const [missingPage, setMissingPage] = useState(1);
  const loader = useCallback(
    async () => {
      const [sent, missing] = await Promise.all([
        bitacoraApi.listActivities({
          estado_documentacion: 'ENVIADA', page: sentPage, limit: PAGE_LIMIT,
        }),
        bitacoraApi.listActivities({
          completitud: 'incompleta',
          estado_documentacion_excluir: 'ENVIADA',
          page: missingPage,
          limit: PAGE_LIMIT,
        }),
      ]);
      return { sent: normalizePaginated(sent), missing: normalizePaginated(missing) };
    },
    [missingPage, sentPage]
  );
  const { data, loading, error, reload } = useRemote(loader);

  const sentItems = useMemo(() => data?.sent?.items || [], [data]);
  const missingItems = useMemo(() => data?.missing?.items || [], [data]);

  const refreshAfterControl = useCallback(() => {
    if (sentItems.length === 1 && sentPage > 1) {
      setSentPage((current) => current - 1);
      return;
    }
    reload();
  }, [reload, sentItems.length, sentPage]);

  if (loading && !data) return <LoadingState label="Cargando control documental…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-igss-900">Control documental</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Revise faltantes, solicite correcciones o cierre la documentación. El relato enviado permanece bajo la autoría de quien lo elaboró.
        </p>
      </div>

      <section aria-labelledby="review-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="review-title" className="text-lg font-bold text-igss-900">
            Pendientes de control ({data?.sent?.total || 0})
          </h2>
          <Link className="text-sm font-semibold text-igss-700 hover:underline" to="/bitacora/calendario">Calendario global</Link>
        </div>
        {sentItems.length === 0 ? (
          <EmptyState title="No hay documentación esperando revisión">
            Las actividades enviadas aparecerán aquí sin necesidad de coordinación adicional.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {sentItems.map((activity) => (
              <div key={activity.id} className="space-y-2">
                <ActivityCard activity={activity} />
                <div className="flex justify-end rounded-xl bg-white px-4 pb-3">
                  <WorkflowActions
                    activity={activity}
                    user={user}
                    onChanged={refreshAfterControl}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination
            page={data?.sent?.page || sentPage}
            limit={data?.sent?.limit || PAGE_LIMIT}
            total={data?.sent?.total || 0}
            onPage={setSentPage}
          />
        </div>
      </section>

      <section aria-labelledby="missing-title">
        <h2 id="missing-title" className="mb-3 text-lg font-bold text-igss-900">
          Con documentación pendiente ({data?.missing?.total || 0})
        </h2>
        {missingItems.length === 0 ? (
          <EmptyState title="No hay faltantes detectados" />
        ) : (
          <div className="space-y-3">
            {missingItems.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} compact />
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination
            page={data?.missing?.page || missingPage}
            limit={data?.missing?.limit || PAGE_LIMIT}
            total={data?.missing?.total || 0}
            onPage={setMissingPage}
          />
        </div>
      </section>
    </div>
  );
}

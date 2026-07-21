import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { bitacoraApi } from '../api';
import { normalizePaginated } from '../model';
import { useRemote } from '../useRemote';
import ActivityCard from '../components/ActivityCard';
import WorkflowActions from '../components/WorkflowActions';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';

export default function ControlPage() {
  const { user } = useAuth();
  const loader = useCallback(
    async () => {
      const [sent, missing] = await Promise.all([
        bitacoraApi.listActivities({ estado_documentacion: 'ENVIADA', page: 1, limit: 100 }),
        bitacoraApi.listActivities({ completitud: 'incompleta', page: 1, limit: 100 }),
      ]);
      return { sent: normalizePaginated(sent), missing: normalizePaginated(missing) };
    },
    []
  );
  const { data, loading, error, reload, setData } = useRemote(loader);

  const updateActivity = (section, id, updated) => {
    if (!updated) return reload();
    const normalized = updated.actividad || updated;
    setData((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        items: previous[section].items
          .map((activity) => (activity.id === id ? { ...activity, ...normalized } : activity))
          .filter((activity) => section !== 'sent' || activity.estado_documentacion === 'ENVIADA'),
      },
    }));
  };

  const sentItems = useMemo(() => data?.sent?.items || [], [data]);
  const missingItems = useMemo(
    () => (data?.missing?.items || []).filter((item) => item.estado_documentacion !== 'ENVIADA'),
    [data]
  );

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
                    onChanged={(updated) => updateActivity('sent', activity.id, updated)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="missing-title">
        <h2 id="missing-title" className="mb-3 text-lg font-bold text-igss-900">
          Con documentación pendiente ({data?.missing?.total || 0})
        </h2>
        {missingItems.length === 0 ? (
          <EmptyState title="No hay faltantes detectados" />
        ) : (
          <div className="space-y-3">
            {missingItems.slice(0, 25).map((activity) => (
              <ActivityCard key={activity.id} activity={activity} compact />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

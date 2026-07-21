import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { fmtDateTime } from '../../../lib/format';
import { useToast } from '../../../contexts/ToastContext';
import { bitacoraApi, newIdempotencyKey } from '../api';
import { normalizePaginated } from '../model';
import { useRemote } from '../useRemote';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';

function destination(notification) {
  const value = notification.url || notification.enlace || notification.target_url;
  if (value?.startsWith('/bitacora')) return value;
  const activityId = notification.actividad_id;
  return activityId ? `/bitacora/actividades/${activityId}` : null;
}

export default function NotificationsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const readKeysRef = useRef(new Map());
  const loader = useCallback(
    () => bitacoraApi.listNotifications({ page, limit: 20, leida: onlyUnread ? false : undefined }),
    [onlyUnread, page]
  );
  const { data, loading, error, reload, setData } = useRemote(loader);
  const result = useMemo(() => normalizePaginated(data, { page, limit: 20 }), [data, page]);

  const markRead = async (notification) => {
    try {
      const key = readKeysRef.current.get(notification.id) || newIdempotencyKey('leer');
      readKeysRef.current.set(notification.id, key);
      await bitacoraApi.readNotification(notification.id, key);
      readKeysRef.current.delete(notification.id);
      setData((previous) => {
        const normalized = normalizePaginated(previous, { page, limit: 20 });
        return {
          ...normalized,
          items: onlyUnread
            ? normalized.items.filter((item) => item.id !== notification.id)
            : normalized.items.map((item) => (
              item.id === notification.id ? { ...item, leida: true, leida_at: new Date().toISOString() } : item
            )),
          total: onlyUnread ? Math.max(0, normalized.total - 1) : normalized.total,
        };
      });
    } catch (requestError) {
      toast.error(requestError?.message || 'No se pudo marcar la notificación.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-igss-900">Notificaciones</h1>
          <p className="mt-1 text-sm text-gray-600">Avisos persistentes de agenda, documentación y acuerdos.</p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(event) => { setOnlyUnread(event.target.checked); setPage(1); }}
            className="h-5 w-5 rounded border-gray-300 text-igss-700"
          />
          Solo no leídas
        </label>
      </div>

      <aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Los avisos de Telegram contienen únicamente un resumen institucional. Los relatos, acuerdos y evidencias se consultan aquí después de autenticarse.
      </aside>

      {loading && !data ? <LoadingState /> : null}
      {error && !data ? <ErrorState error={error} onRetry={reload} /> : null}
      {data && result.items.length === 0 ? <EmptyState title="No hay notificaciones" /> : null}
      {data && result.items.length > 0 && (
        <section className="space-y-3" aria-live="polite" aria-busy={loading}>
          {result.items.map((notification) => {
            const unread = !notification.leida && !notification.leida_at;
            const target = destination(notification);
            return (
              <article
                key={notification.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${unread ? 'border-l-4 border-l-igss-600' : 'border-gray-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-gray-900">{notification.titulo || notification.tipo || 'Aviso de Bitácora'}</h2>
                      {unread && <span className="rounded-full bg-igss-100 px-2 py-0.5 text-xs font-bold text-igss-900">Nueva</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{notification.mensaje || notification.resumen}</p>
                    <p className="mt-2 text-xs text-gray-500">{fmtDateTime(notification.created_at || notification.creada_at || notification.fecha)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {target && (
                      <Link to={target} className="inline-flex min-h-11 items-center rounded-lg border border-igss-300 px-3 text-sm font-semibold text-igss-800 hover:bg-igss-50">
                        Abrir
                      </Link>
                    )}
                    {unread && (
                      <Button variant="ghost" size="sm" className="min-h-11" onClick={() => markRead(notification)}>
                        Marcar leída
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          <Pagination page={result.page} limit={result.limit} total={result.total} onPage={setPage} />
        </section>
      )}
    </div>
  );
}

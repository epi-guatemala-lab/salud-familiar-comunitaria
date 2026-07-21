import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';

export function LoadingState({ label = 'Cargando información…' }) {
  return (
    <div className="min-h-48 grid place-items-center" role="status" aria-live="polite">
      <Spinner label={label} />
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900" role="alert">
      <h2 className="font-bold">No fue posible cargar la información</h2>
      <p className="mt-1 text-sm">{error?.message || 'Intente nuevamente.'}</p>
      {onRetry && (
        <Button type="button" variant="secondary" className="mt-4 min-h-11" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'No hay resultados', children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
      <div className="text-3xl" aria-hidden="true">◎</div>
      <h2 className="mt-2 font-bold text-gray-800">{title}</h2>
      {children && <div className="mx-auto mt-1 max-w-xl text-sm text-gray-600">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

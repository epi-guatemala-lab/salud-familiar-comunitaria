import Button from '../../../components/ui/Button';

export default function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (total <= limit) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginación">
      <p className="text-sm text-gray-600">
        Página <strong>{page}</strong> de <strong>{pages}</strong> · {total} resultados
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}

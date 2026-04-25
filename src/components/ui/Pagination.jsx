export default function Pagination({ page = 1, pages = 1, onChange }) {
  if (pages <= 1) return null;
  const prev = () => onChange?.(Math.max(1, page - 1));
  const next = () => onChange?.(Math.min(pages, page + 1));

  return (
    <nav className="flex items-center gap-2 justify-center text-sm" aria-label="Paginacion">
      <button
        type="button"
        disabled={page <= 1}
        onClick={prev}
        className="px-3 py-1 border rounded disabled:opacity-40"
      >
        ‹ Anterior
      </button>
      <span className="text-gray-600">
        Pagina {page} de {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={next}
        className="px-3 py-1 border rounded disabled:opacity-40"
      >
        Siguiente ›
      </button>
    </nav>
  );
}

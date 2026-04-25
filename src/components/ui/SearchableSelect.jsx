import { useState, useMemo, useRef, useEffect } from 'react';

// Select buscable. Mantiene UX nativa accesible: al hacer focus muestra
// dropdown filtrable. options = [{value, label, sublabel?, group?}]
export default function SearchableSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Buscar...',
  error,
  required,
  disabled,
  id,
  className = '',
  emptyMessage = 'Sin resultados',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => (o.value ?? o.id) === value) || null,
    [options, value]
  );

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const text = `${o.label || ''} ${o.sublabel || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [options, query]);

  const select = (opt) => {
    onChange?.(opt);
    setQuery('');
    setOpen(false);
  };

  const inputId = id || 'searchable-select';

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <button
        type="button"
        id={inputId}
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`text-left border rounded-md p-2 bg-white transition focus:outline-none focus:ring-1 focus:ring-igss-500
          ${error ? 'border-red-500' : 'border-gray-300 focus:border-igss-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selected ? (
          <span>{selected.label}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <span className="float-right text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-auto">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escriba para buscar..."
            className="w-full p-2 border-b border-gray-200 focus:outline-none"
          />
          <ul role="listbox" className="py-1">
            {filtered.length === 0 ? (
              <li className="p-3 text-sm text-gray-500 text-center">{emptyMessage}</li>
            ) : (
              filtered.map((o) => {
                const v = o.value ?? o.id;
                const isSel = v === value;
                return (
                  <li
                    key={v}
                    role="option"
                    aria-selected={isSel}
                    onClick={() => select(o)}
                    className={`px-3 py-2 cursor-pointer hover:bg-igss-50 ${isSel ? 'bg-igss-100' : ''}`}
                  >
                    <div className="font-medium text-gray-800">{o.label}</div>
                    {o.sublabel && <div className="text-xs text-gray-500">{o.sublabel}</div>}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

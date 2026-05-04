import { useMemo } from 'react';
import { useUnidadesPublic } from '../../hooks/useUnidadesPublic';
import SearchableSelect from '../ui/SearchableSelect';
import Spinner from '../ui/Spinner';

// Selector de unidad medica IGSS. Usa cache 24h y fallback estatico si el
// endpoint /api/unidades/public falla.
export default function UnidadSelect({ value, onChange, error, label = 'Unidad / clínica', required = true }) {
  const { unidades, loading, usedFallback } = useUnidadesPublic();

  const options = useMemo(
    () =>
      (unidades || []).map((u) => ({
        value: u.id,
        label: u.nombre,
        sublabel: [u.codigo, u.departamento, u.tipo].filter(Boolean).join(' · '),
        raw: u,
      })),
    [unidades]
  );

  if (loading) {
    return (
      <div className="py-2">
        <Spinner size="sm" label="Cargando unidades..." />
      </div>
    );
  }

  return (
    <div>
      <SearchableSelect
        label={label}
        required={required}
        options={options}
        value={value}
        onChange={(opt) => onChange?.(opt.raw)}
        placeholder="Seleccione su unidad..."
        error={error}
        emptyMessage="Sin unidades disponibles"
      />
      {usedFallback && (
        <p className="text-xs text-yellow-700 mt-1">
          Mostrando lista básica de unidades (sin conexión al servidor).
        </p>
      )}
    </div>
  );
}

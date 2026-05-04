import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatFechaCorta } from '../../lib/format';

/**
 * ResidentesList
 * Tabla con residentes activos a cargo del docente.
 * GET /api/docente/residentes?rotacion=GYO|PEDIATRIA|...
 *
 * Cada item: {
 *   id, nombre_completo, anio_residencia, rotacion_actual,
 *   promedio_generica, promedio_gyo, promedio_pediatria,
 *   ultima_evaluacion_fecha, estado
 * }
 */
export default function ResidentesList() {
  const [rotacionFilter, setRotacionFilter] = useState('');
  const [search, setSearch] = useState('');

  const path = rotacionFilter
    ? `/api/docente/residentes?rotacion=${encodeURIComponent(rotacionFilter)}`
    : '/api/docente/residentes';
  const { data, loading, error, refetch } = useApi(path, [rotacionFilter]);

  const items = useMemo(() => {
    const arr = Array.isArray(data) ? data : data?.data || [];
    if (!search.trim()) return arr;
    const q = search.trim().toLowerCase();
    return arr.filter((r) =>
      (r.nombre_completo || '').toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-igss-900">Residentes</h1>
        <p className="text-sm text-gray-600 mt-1">
          Lista de residentes a su cargo
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Buscar"
              placeholder="Nombre del residente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              label="Rotación"
              value={rotacionFilter}
              onChange={(e) => setRotacionFilter(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="GYO">Ginecología y Obstetricia</option>
              <option value="PEDIATRIA">Pediatría</option>
              <option value="MEDICINA_INTERNA">Medicina Interna</option>
              <option value="CIRUGIA">Cirugía</option>
              <option value="MEDICINA_FAMILIAR">Medicina Familiar</option>
            </Select>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>Error al cargar: {error?.message || 'No se pudo conectar al servidor'}</span>
          <button
            type="button"
            className="text-red-700 underline hover:text-red-900"
            onClick={refetch}
          >
            Reintentar
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-sm text-gray-500 italic text-center">
            No se encontraron residentes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Residente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Año
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Rotación actual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Genérica
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    GYO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Pediatría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Última eval
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      <Link
                        to={`/docentes/residentes/${r.id}`}
                        className="text-igss-700 hover:text-igss-900 hover:underline"
                      >
                        {r.nombre_completo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      R{r.anio_residencia ?? '?'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {r.rotacion_actual || '—'}
                    </td>
                    <PromedioCell value={r.promedio_generica} max={4} />
                    <PromedioCell value={r.promedio_gyo} max={100} pct />
                    <PromedioCell value={r.promedio_pediatria} max={100} pct />
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {r.ultima_evaluacion_fecha
                        ? formatFechaCorta(r.ultima_evaluacion_fecha)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EstadoBadge estado={r.estado} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/docentes/residentes/${r.id}`}
                        className="text-xs font-medium text-igss-700 hover:text-igss-900"
                      >
                        Perfil →
                      </Link>
                      <span className="text-gray-300 mx-2">·</span>
                      <Link
                        to={`/docentes/evaluaciones/nueva?residente_id=${r.id}`}
                        className="text-xs font-medium text-igss-700 hover:text-igss-900"
                      >
                        Evaluar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function PromedioCell({ value, max, pct }) {
  if (value == null || Number.isNaN(Number(value))) {
    return <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">—</td>;
  }
  const num = Number(value);
  const display = pct
    ? `${num.toFixed(0)}%`
    : `${num.toFixed(1)} / ${max}`;
  let cls = 'text-gray-700';
  if (max === 4) {
    if (num >= 3.5) cls = 'text-igss-700 font-semibold';
    else if (num >= 2.5) cls = 'text-amber-700';
    else cls = 'text-red-600';
  } else {
    if (num >= 80) cls = 'text-igss-700 font-semibold';
    else if (num >= 60) cls = 'text-amber-700';
    else cls = 'text-red-600';
  }
  return (
    <td className={`px-4 py-3 text-sm whitespace-nowrap ${cls}`}>{display}</td>
  );
}

function EstadoBadge({ estado }) {
  const map = {
    ACTIVO: { color: 'green', label: 'Activo' },
    INACTIVO: { color: 'gray', label: 'Inactivo' },
    LICENCIA: { color: 'amber', label: 'Licencia' },
    EGRESADO: { color: 'blue', label: 'Egresado' },
  };
  const cfg = map[estado] || { color: 'gray', label: estado || '—' };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

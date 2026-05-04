import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatFechaCorta } from '../../lib/format';

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'PROGRAMADO', label: 'Programado' },
  { value: 'ABIERTO', label: 'Abierto' },
  { value: 'CERRADO', label: 'Cerrado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

/**
 * ExamenesList — exámenes creados por el docente.
 * GET /api/docente/examenes/mis?estado=ABIERTO
 */
export default function ExamenesList() {
  const [estado, setEstado] = useState('');

  const path = estado
    ? `/api/docente/examenes/mis?estado=${encodeURIComponent(estado)}`
    : '/api/docente/examenes/mis';
  const { data, loading, error, refetch } = useApi(path, [estado]);

  const items = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.data || [];
  }, [data]);

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-igss-900">Exámenes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Exámenes y quizzes creados por usted
          </p>
        </div>
        <Link
          to="/docentes/examenes/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-igss-700 text-white text-sm font-medium hover:bg-igss-800"
        >
          + Crear examen
        </Link>
      </div>

      <Card className="p-4">
        <div className="w-full sm:w-56">
          <Select
            label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            {ESTADOS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>Error: {error?.message || 'No se pudo conectar al servidor'}</span>
          <button
            type="button"
            className="underline"
            onClick={refetch}
          >
            Reintentar
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-sm text-gray-500 italic text-center">
            No hay exámenes que coincidan con el filtro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Título
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Rúbrica
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Tema
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Apertura
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Cierre
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Intentos
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      <Link
                        to={`/docentes/examenes/${ex.id}/intentos`}
                        className="text-igss-700 hover:text-igss-900 hover:underline"
                      >
                        {ex.titulo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                      {ex.rubrica_codigo || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                      {ex.tema_titulo || '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EstadoExamenBadge estado={ex.estado} />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                      {ex.fecha_apertura ? formatFechaCorta(ex.fecha_apertura) : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                      {ex.fecha_cierre ? formatFechaCorta(ex.fecha_cierre) : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                      {ex.intentos_count ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link
                        to={`/docentes/examenes/${ex.id}/intentos`}
                        className="text-xs font-medium text-igss-700 hover:text-igss-900"
                      >
                        Intentos →
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

function EstadoExamenBadge({ estado }) {
  const map = {
    BORRADOR: { color: 'gray', label: 'Borrador' },
    PROGRAMADO: { color: 'blue', label: 'Programado' },
    ABIERTO: { color: 'green', label: 'Abierto' },
    CERRADO: { color: 'amber', label: 'Cerrado' },
    CANCELADO: { color: 'red', label: 'Cancelado' },
  };
  const cfg = map[estado] || { color: 'gray', label: estado || '—' };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

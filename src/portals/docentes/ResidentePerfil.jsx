import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import RadioGroup from '../../components/ui/RadioGroup';
import EvaluacionRadar from './EvaluacionRadar';
import SemaforoBadge from './SemaforoBadge';
import { formatFechaCorta } from '../../lib/format';

const TABS = [
  { id: 'evaluaciones', label: 'Evaluaciones' },
  { id: 'examenes', label: 'Exámenes' },
  { id: 'comparativa', label: 'Comparativa cohorte' },
  { id: 'proximas', label: 'Próximas' },
];

/**
 * ResidentePerfil
 * GET /api/docente/residentes/{id}
 * Response: {
 *   residente: {id, nombre_completo, anio, rotacion_actual, ...},
 *   evaluaciones: [{id, fecha, rubrica_codigo, tema_titulo, porcentaje, nivel_global, estado}],
 *   intentos: [{id, examen_titulo, fecha_envio, puntaje_total, suspicion_score, estado}],
 *   cohorte_comparativa: {dimensiones: [{nombre, residente_pct, cohorte_pct}]},
 *   proximas: [{tipo, fecha, titulo}]
 * }
 */
export default function ResidentePerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('evaluaciones');
  const { data, loading, error } = useApi(`/api/docente/residentes/${id}`);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
        Error: {error.message}{' '}
        <Link to="/docentes/residentes" className="underline ml-2">
          Volver
        </Link>
      </div>
    );
  }
  const r = data?.residente || data || {};

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <Link
          to="/docentes/residentes"
          className="text-sm text-igss-700 hover:text-igss-900"
        >
          ← Volver a residentes
        </Link>
      </div>

      {/* Header metadata */}
      <Card className="p-5">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-igss-900">
              {r.nombre_completo || '—'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <Badge color="green">R{r.anio_residencia ?? '?'}</Badge>
              {r.rotacion_actual && (
                <Badge color="blue">{r.rotacion_actual}</Badge>
              )}
              {r.estado && (
                <Badge color={r.estado === 'ACTIVO' ? 'green' : 'gray'}>
                  {r.estado}
                </Badge>
              )}
              {r.cui && <span className="text-xs">CUI: {r.cui}</span>}
              {r.email && <span className="text-xs">· {r.email}</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-2">
          <RadioGroup
            value={tab}
            onChange={setTab}
            ariaLabel="Tabs perfil residente"
            options={TABS}
            variant="tabs"
          />
        </div>

        <div className="p-5">
          {tab === 'evaluaciones' && (
            <EvaluacionesTab evaluaciones={data?.evaluaciones || []} residenteId={id} />
          )}
          {tab === 'examenes' && (
            <ExamenesTab intentos={data?.intentos || []} />
          )}
          {tab === 'comparativa' && (
            <ComparativaTab data={data?.cohorte_comparativa} />
          )}
          {tab === 'proximas' && (
            <ProximasTab proximas={data?.proximas || []} />
          )}
        </div>
      </Card>

      {/* Sticky botón nueva evaluación */}
      <div className="sticky bottom-4 flex justify-end pointer-events-none">
        <button
          type="button"
          onClick={() =>
            navigate(`/docentes/evaluaciones/nueva?residente_id=${id}`)
          }
          className="pointer-events-auto inline-flex items-center gap-2 px-5 py-3 rounded-full bg-igss-700 text-white font-semibold shadow-lg hover:bg-igss-800"
        >
          <span>+</span>
          <span>Nueva evaluación</span>
        </button>
      </div>
    </div>
  );
}

function EvaluacionesTab({ evaluaciones, residenteId }) {
  if (evaluaciones.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Aún no hay evaluaciones registradas para este residente.{' '}
        <Link
          to={`/docentes/evaluaciones/nueva?residente_id=${residenteId}`}
          className="text-igss-700 underline hover:text-igss-900"
        >
          Crear la primera
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Fecha
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Rúbrica
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Tema
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              %
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Nivel
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Estado
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {evaluaciones.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                {formatFechaCorta(e.fecha)}
              </td>
              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                {e.rubrica_codigo}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700">
                {e.tema_titulo || '—'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-900 font-medium whitespace-nowrap">
                {e.porcentaje != null ? `${Number(e.porcentaje).toFixed(0)}%` : '—'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                {e.nivel_global || '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <Badge color={e.estado === 'FIRMADA' ? 'green' : 'amber'}>
                  {e.estado}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <Link
                  to={`/docentes/evaluaciones/${e.id}`}
                  className="text-xs font-medium text-igss-700 hover:text-igss-900"
                >
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExamenesTab({ intentos }) {
  if (intentos.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        El residente no ha rendido exámenes todavía.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Examen
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Fecha
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Puntaje
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Integridad
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
              Estado
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {intentos.map((i) => (
            <tr key={i.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-sm text-gray-900">{i.examen_titulo}</td>
              <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                {i.fecha_envio ? formatFechaCorta(i.fecha_envio) : '—'}
              </td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                {i.puntaje_total != null ? `${i.puntaje_total}` : '—'}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <SemaforoBadge score={i.suspicion_score} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <Badge color="gray">{i.estado}</Badge>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <Link
                  to={`/docentes/intentos/${i.id}`}
                  className="text-xs font-medium text-igss-700 hover:text-igss-900"
                >
                  Detalle →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparativaTab({ data }) {
  if (!data || !data.dimensiones || data.dimensiones.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No hay suficientes datos para construir la comparativa con la cohorte.
      </p>
    );
  }
  // EvaluacionRadar acepta array de {dimension, valor, comparativo?}
  const radarData = data.dimensiones.map((d) => ({
    dimension: d.nombre,
    valor: Number(d.residente_pct) || 0,
    comparativo: Number(d.cohorte_pct) || 0,
  }));
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Perfil del residente vs promedio cohorte
      </h3>
      <EvaluacionRadar data={radarData} showComparativo height={360} />
    </div>
  );
}

function ProximasTab({ proximas }) {
  if (proximas.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No hay rotaciones ni exámenes próximos programados.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {proximas.map((p, idx) => (
        <li key={idx} className="py-3 flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">
            {p.tipo === 'EXAMEN' ? '📝' : '🔁'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{p.titulo}</p>
            <p className="text-xs text-gray-500">
              {formatFechaCorta(p.fecha)} ·{' '}
              {p.tipo === 'EXAMEN' ? 'Examen' : 'Rotación'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

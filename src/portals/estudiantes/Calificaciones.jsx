// src/portals/estudiantes/Calificaciones.jsx
//
// Vista de calificaciones del estudiante con tabs internos:
//   - Rúbricas (tabla de evaluaciones firmadas)
//   - Exámenes (tabla de intentos)
//   - Resumen (gráficas de progreso, comparativa con cohorte anonimizada)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

const TABS = [
  { key: 'rubricas', label: 'Rúbricas', icon: '📋' },
  { key: 'examenes', label: 'Exámenes', icon: '📝' },
  { key: 'resumen', label: 'Resumen', icon: '📊' },
];

export default function Calificaciones() {
  const [tab, setTab] = useState('rubricas');

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-igss-900 mb-4">Mis calificaciones</h1>

      <div className="border-b mb-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-igss-700 text-igss-800'
                : 'border-transparent text-gray-500 hover:text-igss-700'
            }`}
          >
            <span className="mr-1" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rubricas' && <TabRubricas />}
      {tab === 'examenes' && <TabExamenes />}
      {tab === 'resumen' && <TabResumen />}
    </div>
  );
}

// ----------------------------------------------------------------------
// Tab Rúbricas — evaluaciones firmadas
// ----------------------------------------------------------------------
function TabRubricas() {
  const { data, loading, error } = useApi('/api/estudiante/mis-evaluaciones');
  const evals = Array.isArray(data) ? data : data?.data || [];

  if (loading) return <Loading />;
  if (error) return <Err error={error} />;
  if (evals.length === 0) return <Empty msg="Aún no tienes evaluaciones firmadas." />;

  return (
    <div className="bg-white border rounded shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-igss-900 text-left">
          <tr>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Rúbrica</th>
            <th className="px-3 py-2">Tema</th>
            <th className="px-3 py-2">Docente</th>
            <th className="px-3 py-2 text-right">%</th>
            <th className="px-3 py-2">Nivel</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {evals.map((e) => (
            <tr key={e.id} className="border-t hover:bg-igss-50">
              <td className="px-3 py-2 whitespace-nowrap">
                {e.fecha ? new Date(e.fecha).toLocaleDateString('es-GT') : '—'}
              </td>
              <td className="px-3 py-2 font-medium">{e.rubrica || e.tipo}</td>
              <td className="px-3 py-2">{e.tema || '—'}</td>
              <td className="px-3 py-2">{e.docente || '—'}</td>
              <td className="px-3 py-2 text-right font-mono">
                {e.porcentaje != null ? `${Math.round(e.porcentaje)}%` : '—'}
              </td>
              <td className="px-3 py-2">
                <NivelBadge nivel={e.nivel} />
              </td>
              <td className="px-3 py-2">
                <Link
                  to={`/estudiantes/calificaciones/evaluacion/${e.id}`}
                  className="text-igss-700 hover:underline text-sm"
                >
                  Ver detalle →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------------------------------------------------
// Tab Exámenes — intentos
// ----------------------------------------------------------------------
function TabExamenes() {
  const { data, loading, error } = useApi('/api/estudiante/mis-examenes');
  const intentos = Array.isArray(data) ? data : data?.data || [];

  if (loading) return <Loading />;
  if (error) return <Err error={error} />;
  if (intentos.length === 0) return <Empty msg="Aún no has rendido exámenes." />;

  return (
    <div className="bg-white border rounded shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-igss-900 text-left">
          <tr>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Examen</th>
            <th className="px-3 py-2 text-right">Puntaje</th>
            <th className="px-3 py-2 text-right">%</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {intentos.map((it) => (
            <tr key={it.intento_id || it.id} className="border-t hover:bg-igss-50">
              <td className="px-3 py-2 whitespace-nowrap">
                {it.fecha_envio
                  ? new Date(it.fecha_envio).toLocaleDateString('es-GT')
                  : '—'}
              </td>
              <td className="px-3 py-2 font-medium">{it.titulo || it.examen}</td>
              <td className="px-3 py-2 text-right font-mono">
                {it.puntaje != null ? it.puntaje : '—'}
                {it.puntaje_max != null && (
                  <span className="text-gray-500"> / {it.puntaje_max}</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {it.porcentaje != null ? `${Math.round(it.porcentaje)}%` : '—'}
              </td>
              <td className="px-3 py-2">
                <EstadoBadge estado={it.estado} />
              </td>
              <td className="px-3 py-2">
                <Link
                  to={`/estudiantes/calificaciones/examen/${it.intento_id || it.id}`}
                  className="text-igss-700 hover:underline text-sm"
                >
                  Ver detalle →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------------------------------------------------
// Tab Resumen
// ----------------------------------------------------------------------
function TabResumen() {
  const { data, loading, error } = useApi('/api/estudiante/calificaciones/resumen');
  if (loading) return <Loading />;
  if (error) return <Err error={error} />;
  if (!data) return <Empty msg="Aún no hay datos suficientes para tu resumen." />;

  const promedios = data.promedios || {};
  const cohorte = data.cohorte || {};

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded p-4">
        <h2 className="font-bold text-igss-900 mb-3">Promedios por rúbrica</h2>
        <ul className="space-y-2">
          {Object.entries(promedios).map(([k, v]) => (
            <li key={k} className="flex justify-between border-b pb-2">
              <span className="capitalize">{k}</span>
              <span className="font-mono">
                {typeof v === 'number' ? v.toFixed(1) : v}
                {cohorte[k] != null && (
                  <span className="ml-2 text-xs text-gray-500">
                    cohorte: {Number(cohorte[k]).toFixed(1)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* TODO: Recharts radar/bar (depende de scaffold de Agent B). */}
    </div>
  );
}

// ---- helpers visuales ----
function NivelBadge({ nivel }) {
  if (!nivel) return <span className="text-gray-400">—</span>;
  const map = {
    EXCELENTE: 'bg-igss-200 text-igss-900',
    EXC: 'bg-igss-200 text-igss-900',
    ADECUADO: 'bg-sfyc-amarillo text-igss-900',
    ADC: 'bg-sfyc-amarillo text-igss-900',
    DEFICIENTE: 'bg-sfyc-rojo text-white',
    DEF: 'bg-sfyc-rojo text-white',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        map[String(nivel).toUpperCase()] || 'bg-gray-200 text-gray-700'
      }`}
    >
      {nivel}
    </span>
  );
}

function EstadoBadge({ estado }) {
  if (!estado) return <span className="text-gray-400">—</span>;
  const map = {
    CALIFICADO: 'bg-igss-200 text-igss-900',
    CALIFICADO_AUTO: 'bg-igss-200 text-igss-900',
    PENDIENTE_DOCENTE: 'bg-sfyc-amarillo text-igss-900',
    AUTO_SUBMITTED: 'bg-sfyc-rojo text-white',
    EN_REVISION: 'bg-sfyc-amarillo text-igss-900',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        map[String(estado).toUpperCase()] || 'bg-gray-200 text-gray-700'
      }`}
    >
      {estado}
    </span>
  );
}

function Loading() {
  return <div className="text-center py-12 text-gray-500 animate-pulse">Cargando…</div>;
}
function Err({ error }) {
  return (
    <div className="bg-sfyc-rojo/10 border border-sfyc-rojo text-sfyc-rojo p-4 rounded">
      {error?.message || 'Error cargando datos'}
    </div>
  );
}
function Empty({ msg }) {
  return (
    <div className="bg-white border rounded p-8 text-center text-gray-600">
      <p className="text-3xl mb-2" aria-hidden="true">
        📂
      </p>
      <p>{msg}</p>
    </div>
  );
}

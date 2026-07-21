import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import { formatFechaLarga } from '../../lib/format';

/**
 * DocenteDashboard
 * GET /api/docente/dashboard → {
 *   evaluaciones_pendientes, residentes_a_cargo, examenes_activos, respuestas_por_revisar,
 *   proximas_evaluaciones: [{id, fecha, residente_nombre, rubrica_codigo, tema_titulo}]
 * }
 */
export default function DocenteDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi('/api/docente/dashboard');

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-igss-900">
          Bienvenido, {user?.nombre_completo || user?.username || 'Docente'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Panel principal · {formatFechaLarga(new Date())}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          Error al cargar dashboard: {error?.message || 'No se pudo conectar al servidor'}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          loading={loading}
          icon="🟡"
          value={data?.evaluaciones_pendientes ?? 0}
          label="Evaluaciones pendientes"
          to="/docentes/residentes"
          accent="amarillo"
        />
        <KpiCard
          loading={loading}
          icon="👥"
          value={data?.residentes_a_cargo ?? 0}
          label="Residentes a mi cargo"
          to="/docentes/residentes"
          accent="verde"
        />
        <KpiCard
          loading={loading}
          icon="📝"
          value={data?.examenes_activos ?? 0}
          label="Exámenes activos"
          to="/docentes/examenes?estado=ABIERTO"
          accent="azul"
        />
        <KpiCard
          loading={loading}
          icon="✏️"
          value={data?.respuestas_por_revisar ?? 0}
          label="Respuestas por revisar"
          to="/docentes/respuestas-abiertas"
          accent="rojo"
        />
      </div>

      {/* Atajos */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Atajos</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/docentes/evaluaciones/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-igss-700 text-white text-sm font-medium hover:bg-igss-800"
          >
            <span>+</span> Nueva evaluación
          </Link>
          <Link
            to="/docentes/examenes/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-igss-700 text-igss-800 text-sm font-medium hover:bg-igss-50"
          >
            <span>+</span> Crear examen
          </Link>
          <Link
            to="/docentes/preguntas"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Banco de preguntas
          </Link>
        </div>
      </Card>

      {/* Próximas evaluaciones programadas */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Próximas evaluaciones programadas
          </h2>
          <Link
            to="/docentes/residentes"
            className="text-xs font-medium text-igss-700 hover:text-igss-900"
          >
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <SkeletonList rows={3} />
        ) : (data?.proximas_evaluaciones?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-500 italic">No hay evaluaciones programadas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.proximas_evaluaciones.map((ev) => (
              <li key={ev.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {ev.residente_nombre} —{' '}
                    {ev.rubrica_codigo === 'GENERICA'
                      ? 'Genérica'
                      : `${ev.rubrica_codigo} ${ev.tema_titulo ? `· ${ev.tema_titulo}` : ''}`}
                  </p>
                  <p className="text-xs text-gray-500">{formatFechaLarga(ev.fecha)}</p>
                </div>
                <Link
                  to={`/docentes/evaluaciones/${ev.id}`}
                  className="text-xs font-medium text-igss-700 hover:text-igss-900 whitespace-nowrap"
                >
                  Abrir →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ loading, icon, value, label, to, accent }) {
  const accentMap = {
    amarillo: 'border-l-amber-400',
    verde: 'border-l-igss-600',
    azul: 'border-l-blue-500',
    rojo: 'border-l-red-500',
  };
  const content = (
    <Card
      className={`p-4 border-l-4 ${accentMap[accent] || 'border-l-igss-600'} h-full`}
    >
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl" aria-hidden="true">
              {icon}
            </span>
            <span className="text-3xl font-bold text-igss-900">{value}</span>
          </div>
          <p className="mt-1 text-xs font-medium text-gray-600 uppercase tracking-wide">
            {label}
          </p>
        </>
      )}
    </Card>
  );
  return to ? (
    <Link to={to} className="block hover:scale-[1.01] transition-transform">
      {content}
    </Link>
  ) : (
    content
  );
}

function SkeletonList({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-3/5 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-2/5 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

function fmtFechaCorta(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function countdown(iso) {
  if (!iso) return '—';
  try {
    const dif = new Date(iso).getTime() - Date.now();
    if (dif <= 0) return 'Ya disponible';
    const horas = dif / 3600000;
    if (horas < 1) {
      return `en ${Math.max(1, Math.round(dif / 60000))} min`;
    }
    if (horas < 24) {
      return `en ${horas.toFixed(0)} h`;
    }
    const dias = Math.floor(horas / 24);
    return `en ${dias} día${dias === 1 ? '' : 's'}`;
  } catch {
    return iso;
  }
}

/**
 * EstudianteDashboard
 * GET /api/estudiante/dashboard → {
 *   proxima_evaluacion: { fecha, docente_nombre, rubrica_codigo, tema_titulo },
 *   examenes_activos: [{ id, titulo, fecha_inicio, fecha_fin, duracion_minutos }],
 *   promedios: { generica, gyo, pediatria },
 *   nuevas_calificaciones: [{ id, docente_nombre, rubrica_codigo, porcentaje, nivel, fecha }],
 *   nuevas_calificaciones_count: number,
 * }
 */
export default function EstudianteDashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi('/api/estudiante/dashboard');

  const examenesActivos = useMemo(() => data?.examenes_activos || [], [data]);
  const proxima = data?.proxima_evaluacion || null;
  const promedios = data?.promedios || {};
  const nuevasCalif = data?.nuevas_calificaciones || [];
  const nuevasCount = data?.nuevas_calificaciones_count ?? nuevasCalif.length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-igss-900">
          Hola, {user?.nombre_completo || user?.username || 'Residente'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Bienvenido a su panel de estudiante de SFyC
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          Error al cargar dashboard: {error?.message || 'No se pudo conectar al servidor'}
        </div>
      )}

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          {/* 4 cards principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-blue-500">
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Próxima evaluación
              </h3>
              {proxima ? (
                <>
                  <p className="text-sm font-semibold text-igss-900">
                    {fmtFechaCorta(proxima.fecha)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {proxima.docente_nombre || 'Docente —'}
                  </p>
                  <p className="text-xs text-gray-500 italic mt-0.5">
                    {proxima.rubrica_codigo === 'GENERICA'
                      ? 'Genérica'
                      : `${proxima.rubrica_codigo || ''} ${
                          proxima.tema_titulo ? `· ${proxima.tema_titulo}` : ''
                        }`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">Sin evaluaciones</p>
              )}
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-400">
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Exámenes por rendir
              </h3>
              <p className="text-3xl font-bold text-igss-900">
                {examenesActivos.length}
              </p>
              {examenesActivos[0] && (
                <p className="text-xs text-gray-600 mt-1">
                  Próximo cierre: {countdown(
                    examenesActivos[0].fecha_cierre || examenesActivos[0].fecha_fin
                  )}
                </p>
              )}
              {examenesActivos.length === 0 && (
                <p className="text-xs text-gray-500 italic mt-1">
                  Sin exámenes pendientes de rendir.
                </p>
              )}
            </Card>

            <Card className="p-4 border-l-4 border-l-igss-600">
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Mi promedio
              </h3>
              <PromedioBars promedios={promedios} />
            </Card>

            <Card className="p-4 border-l-4 border-l-red-500">
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Nuevas calificaciones
              </h3>
              <p className="text-3xl font-bold text-igss-900">{nuevasCount}</p>
              <p className="text-xs text-gray-600 mt-1">desde último ingreso</p>
              {nuevasCount > 0 && (
                <Link
                  to="/estudiantes/calificaciones"
                  className="text-xs font-medium text-igss-700 hover:text-igss-900 mt-2 inline-block"
                >
                  Ver todas →
                </Link>
              )}
            </Card>
          </div>

          {/* Sección exámenes por rendir */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Exámenes por rendir</h2>
              <Link
                to="/estudiantes/examenes"
                className="text-xs font-medium text-igss-700 hover:text-igss-900"
              >
                Ver todos →
              </Link>
            </div>
            {examenesActivos.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No tienes exámenes pendientes de rendir en este momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {examenesActivos.slice(0, 4).map((ex) => (
                  <Card key={ex.id} className="p-4 border border-igss-200">
                    <p className="text-sm font-semibold text-igss-900">{ex.titulo}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Cierra {countdown((ex.fecha_cierre || ex.fecha_fin))}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Duración: {ex.duracion_minutos || '—'} min
                    </p>
                    <Link
                      to={`/estudiantes/examenes/${ex.id}`}
                      className="mt-3 inline-block px-3 py-1.5 rounded bg-igss-700 text-white text-xs font-medium hover:bg-igss-800"
                    >
                      Iniciar →
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* Sección nuevas calificaciones */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Nuevas calificaciones
              </h2>
              <Link
                to="/estudiantes/calificaciones"
                className="text-xs font-medium text-igss-700 hover:text-igss-900"
              >
                Ver todas →
              </Link>
            </div>
            {nuevasCalif.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Sin calificaciones nuevas.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {nuevasCalif.slice(0, 5).map((c) => (
                  <li
                    key={c.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.docente_nombre || 'Docente'} · {c.rubrica_codigo}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fmtFechaCorta(c.fecha)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-sm font-semibold text-igss-900">
                        {c.porcentaje != null
                          ? `${Number(c.porcentaje).toFixed(0)}%`
                          : '—'}
                      </span>
                      <NivelBadge nivel={c.nivel} />
                      <Link
                        to={`/estudiantes/evaluaciones/${c.id}`}
                        className="text-xs font-medium text-igss-700 hover:text-igss-900"
                      >
                        Ver →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function PromedioBars({ promedios }) {
  const rows = [
    { key: 'generica', label: 'Genérica', max: 4, color: 'bg-igss-600' },
    { key: 'gyo', label: 'GYO', max: 100, color: 'bg-blue-500' },
    { key: 'pediatria', label: 'Pediatría', max: 100, color: 'bg-amber-500' },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const val = promedios?.[r.key];
        if (val == null || Number.isNaN(Number(val))) {
          return (
            <div key={r.key} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{r.label}</span>
              <span className="text-gray-400">—</span>
            </div>
          );
        }
        const num = Number(val);
        const pct = Math.min(100, (num / r.max) * 100);
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-gray-600">{r.label}</span>
              <span className="font-semibold text-gray-800">
                {r.max === 4 ? num.toFixed(1) : `${num.toFixed(0)}%`}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full ${r.color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NivelBadge({ nivel }) {
  if (!nivel) return null;
  const map = {
    INSUFICIENTE: { tone: 'red', label: 'Insuficiente' },
    REGULAR: { tone: 'yellow', label: 'Regular' },
    BUENO: { tone: 'blue', label: 'Bueno' },
    EXCELENTE: { tone: 'green', label: 'Excelente' },
  };
  const cfg = map[nivel] || { tone: 'default', label: nivel };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

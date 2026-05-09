// src/portals/estudiantes/ExamenesActivos.jsx
//
// Listado de exámenes asignados al estudiante con countdown a cierre,
// modo anti-trampa y botón "Iniciar examen" → /estudiantes/examenes/:id

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

const MODO_BADGE = {
  LAXO: 'bg-igss-200 text-igss-900',
  NORMAL: 'bg-sfyc-amarillo text-igss-900',
  ESTRICTO: 'bg-sfyc-rojo text-white',
};

function formatRestante(deadline) {
  if (!deadline) return '—';
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'Cerrado';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ExamenesActivos() {
  const { data, loading, error, refetch } = useApi('/api/estudiante/examenes/activos');
  const [, force] = useState(0);

  // Re-render cada minuto para refrescar countdowns sin re-fetch
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const examenes = Array.isArray(data) ? data : data?.data || [];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-igss-900">Exámenes activos</h1>
        <button
          type="button"
          onClick={refetch}
          className="text-sm text-igss-700 hover:underline"
        >
          ↻ Actualizar
        </button>
      </header>

      {loading && (
        <div className="text-gray-500 animate-pulse py-12 text-center">Cargando…</div>
      )}

      {error && (
        <div className="bg-sfyc-rojo/10 border border-sfyc-rojo text-sfyc-rojo p-4 rounded">
          No se pudieron cargar los exámenes: {error?.message || 'No se pudo conectar al servidor'}
        </div>
      )}

      {!loading && !error && examenes.length === 0 && (
        <div className="bg-white border rounded p-8 text-center text-gray-600">
          <p className="text-3xl mb-2" aria-hidden="true">
            📭
          </p>
          <p className="font-semibold">No tienes exámenes activos en este momento.</p>
          <p className="text-sm text-gray-500 mt-1">
            Cuando un docente publique un examen para tu rotación, aparecerá aquí.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {examenes.map((ex) => {
          // Examen cerrado = fecha de cierre ya pasó. Antes seguía
          // accesible vía URL directa con botón "Iniciar →" porque la
          // lista solo filtraba por estado='ACTIVO'.
          const cerrado = ex.fecha_cierre
            && new Date(ex.fecha_cierre).getTime() <= Date.now();
          return (
          <li
            key={ex.id}
            className={`bg-white border rounded-lg shadow-sm hover:shadow transition-shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
              cerrado ? 'opacity-60' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-lg text-igss-900 truncate">
                  {ex.titulo}
                </h2>
                {(() => {
                  // Backend devuelve `modo_anti_trampa`, no `modo`. Antes
                  // intentábamos leer `ex.modo` (undefined) → badge vacío.
                  const modo = ex.modo_anti_trampa || ex.modo || 'NORMAL';
                  return (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        MODO_BADGE[modo] || MODO_BADGE.NORMAL
                      }`}
                    >
                      {modo}
                    </span>
                  );
                })()}
                {cerrado && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                    Cerrado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {ex.total_preguntas} preguntas · {ex.duracion_minutos} minutos
                {(ex.creado_por_docente_nombre || ex.docente) &&
                  ` · ${ex.creado_por_docente_nombre || ex.docente}`}
              </p>
              <p className="text-sm mt-1">
                <span className="text-gray-500">
                  {cerrado ? 'Cerró:' : 'Cierra en:'}
                </span>{' '}
                <span className="font-mono font-semibold text-igss-800">
                  {formatRestante(ex.fecha_cierre)}
                </span>
              </p>
            </div>
            <div className="flex-shrink-0">
              {cerrado ? (
                <span className="text-sm text-gray-500 italic">
                  Ventana de examen finalizada
                </span>
              ) : ex.intento_en_curso ? (
                <Link
                  to={`/estudiantes/examenes/${ex.id}/runner`}
                  className="bg-sfyc-amarillo hover:bg-sfyc-amarillo/90 text-igss-900 font-bold px-4 py-2 rounded inline-block"
                >
                  ↻ Continuar
                </Link>
              ) : ex.intentos_disponibles === 0 ? (
                <span className="text-sm text-gray-500 italic">
                  Sin intentos disponibles
                </span>
              ) : (
                <Link
                  to={`/estudiantes/examenes/${ex.id}`}
                  className="bg-igss-700 hover:bg-igss-800 text-white font-bold px-4 py-2 rounded inline-block"
                >
                  Iniciar examen
                </Link>
              )}
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

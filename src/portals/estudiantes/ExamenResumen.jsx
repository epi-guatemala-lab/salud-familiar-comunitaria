// src/portals/estudiantes/ExamenResumen.jsx
//
// Pantalla post-envío del examen. Muestra el resultado parcial
// (solo lo auto-calificable: MCQ/MULTIPLE/VF). Si hay preguntas
// abiertas pendientes de calificación docente, lo informa.

import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

export default function ExamenResumen() {
  const params = useParams();
  const examenId = params.id;
  const intentoIdParam = params.intentoId;
  const location = useLocation();
  const intentoIdFromState = location.state?.intentoId;
  const resultadoFromState = location.state?.resultado;

  // 3 formas de llegar:
  //  1) /examenes/:id/resumen + state.resultado (post-submit inline)
  //  2) /examenes/:id/resumen sin state (refresh) → último intento del examen
  //  3) /intentos/:intentoId/resumen (desde Calificaciones) → ese intento puntual
  const intentoId = intentoIdParam || intentoIdFromState;
  const url = intentoId
    ? `/api/estudiante/intentos/${intentoId}`
    : `/api/estudiante/examenes/${examenId}/ultimo-intento`;
  // useApi espera (path, depsArray). Pasar `null` salta el fetch cuando ya
  // recibimos el resultado por location.state (evita TypeError al spread).
  const { data, loading, error } = useApi(resultadoFromState ? null : url);

  // Asegurar que salimos de fullscreen al llegar acá
  useEffect(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
    } catch {
      /* ignore */
    }
  }, []);

  const resumen = resultadoFromState || data;

  // Si el backend devolvió 404 (intento no existe / no es del residente
  // logueado), antes la pantalla quedaba en "Cargando resumen…" infinito
  // porque resumen=null y loading=false sin handler de error.
  if (!loading && !resumen && error) {
    const status = error?.status ?? 0;
    return (
      <div className="max-w-lg mx-auto p-6 mt-8 bg-white rounded-lg shadow border">
        <h1 className="text-xl font-bold text-sfyc-rojo mb-2">
          {status === 404 ? 'Intento no encontrado' : 'No se pudo cargar el resumen'}
        </h1>
        <p className="text-gray-700 mb-4 text-sm">
          {status === 404
            ? 'El intento que buscas no existe o no te pertenece.'
            : error?.message || 'Error inesperado al consultar el resumen.'}
        </p>
        <Link
          to="/estudiantes/calificaciones"
          className="inline-block bg-igss-700 hover:bg-igss-800 text-white font-bold px-4 py-2 rounded"
        >
          ← Volver a calificaciones
        </Link>
      </div>
    );
  }

  if (loading || !resumen) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <span className="animate-pulse">Cargando resumen…</span>
      </div>
    );
  }

  const tienePendientesAbiertas = Boolean(
    resumen.tiene_abiertas || resumen.preguntas_abiertas_pendientes
  );
  const puntajeAuto = resumen.puntaje_auto ?? resumen.puntaje;
  const puntajeMax = resumen.puntaje_max ?? resumen.puntaje_total ?? null;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <header className="bg-igss-700 text-white px-6 py-4">
          <h1 className="text-2xl font-bold">Examen enviado</h1>
          <p className="text-sm text-igss-100 mt-1">
            {resumen.titulo || 'Tu intento se registró correctamente.'}
          </p>
        </header>

        <section className="px-6 py-5 space-y-4">
          <div className="bg-igss-50 border border-igss-200 rounded p-4">
            <div className="text-sm text-gray-600">Puntaje (auto-calificación)</div>
            <div className="text-3xl font-bold text-igss-800 mt-1">
              {puntajeAuto != null ? puntajeAuto : '—'}
              {puntajeMax != null && (
                <span className="text-base text-gray-500 font-normal"> / {puntajeMax}</span>
              )}
            </div>
            {puntajeMax != null && puntajeAuto != null && (
              <div className="text-sm text-gray-700 mt-1">
                {Math.round((puntajeAuto / puntajeMax) * 100)}% del total
              </div>
            )}
          </div>

          {tienePendientesAbiertas && (
            <div className="bg-sfyc-amarillo/30 border border-sfyc-amarillo p-3 rounded text-sm">
              <strong>Preguntas abiertas pendientes:</strong> tus respuestas a las
              preguntas abiertas serán calificadas pronto por el docente. Recibirás una
              notificación cuando estén listas.
            </div>
          )}

          {resumen.estado === 'AUTO_SUBMITTED' && (
            <div className="bg-sfyc-rojo/10 border border-sfyc-rojo text-sfyc-rojo p-3 rounded text-sm">
              Tu intento se cerró automáticamente por incidente. Puedes consultar el
              detalle con tu coordinador docente.
            </div>
          )}

          {Array.isArray(resumen.por_pregunta) && resumen.por_pregunta.length > 0 && (
            <div>
              <h2 className="font-bold text-igss-900 mb-2">Detalle</h2>
              <ul className="space-y-1 text-sm">
                {resumen.por_pregunta.map((p, i) => (
                  <li
                    key={p.pregunta_id || i}
                    className="flex justify-between items-center border-b py-1"
                  >
                    <span>
                      {i + 1}. {p.tipo}
                    </span>
                    <span
                      className={
                        p.correcto === true
                          ? 'text-igss-700 font-semibold'
                          : p.correcto === false
                          ? 'text-sfyc-rojo font-semibold'
                          : 'text-gray-500'
                      }
                    >
                      {p.correcto === true && '✓ correcto'}
                      {p.correcto === false && '✗ incorrecto'}
                      {p.correcto == null && '⏳ pendiente'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <footer className="px-6 py-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            to="/estudiantes/calificaciones"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-center"
          >
            Ver mis calificaciones
          </Link>
          <Link
            to="/estudiantes"
            className="bg-igss-700 hover:bg-igss-800 text-white font-bold px-4 py-2 rounded text-center"
          >
            Volver al dashboard
          </Link>
        </footer>
      </div>
    </div>
  );
}

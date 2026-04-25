// src/portals/estudiantes/ExamenRunner.jsx
//
// Componente core del subsistema anti-cheat. Renderiza una pregunta a
// la vez en pantalla completa, con watermark, timer server-side,
// indicador de strikes, y modal de confirmación de envío.
//
// Inputs por router state:
//   location.state.intento = {
//     intento_id, examen_id, csrf_token, modo, max_strikes,
//     fullscreen_obligatorio, total_preguntas, fecha_limite,
//     server_now, titulo, watermark_token, ...
//   }
//
// Si llegan a esta ruta sin state (ej. recarga), el efecto inicial
// hace fetch a /api/estudiante/intentos/{id}/resume para reconstruir.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { useExamenIntento } from '../../hooks/useExamenIntento';
import { api } from '../../lib/api';

import Watermark from './Watermark';
import StrikeWarningModal from './StrikeWarningModal';
import LockedScreen from './LockedScreen';
import Timer from './Timer';
import StrikesIndicator from './StrikesIndicator';
import PreguntaView from './PreguntaView';

export default function ExamenRunner() {
  const { id: examenId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth?.() || { user: null };

  const [intento, setIntento] = useState(location.state?.intento || null);
  const [bootError, setBootError] = useState(null);

  // Si recargaron la pantalla, no tenemos state. Intentamos resume.
  useEffect(() => {
    if (intento) return;
    let alive = true;
    (async () => {
      try {
        // Buscar el intento ACTIVO de este examen para este usuario.
        const resp = await api.get(`/api/estudiante/intentos/activo?examen_id=${examenId}`);
        if (alive) setIntento(resp);
      } catch (err) {
        if (alive) setBootError(err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [examenId, intento]);

  // ----- Hooks principales -----
  const intentoId = intento?.intento_id;
  const intentoState = useExamenIntento(intentoId, intento || {});

  const antiCheat = useAntiCheat({
    intentoId,
    csrfToken: intento?.csrf_token,
    config: intento || {},
    onAutoSubmit: async (reason) => {
      // El backend ya marcó force_submit; intentamos enviar las
      // respuestas pendientes y luego mostramos LockedScreen.
      try {
        await intentoState.submit({ forzado: true, motivo: reason });
      } catch {
        /* ignore */
      }
    },
    onLock: () => {
      // No navegamos; la propia pantalla LockedScreen muestra el botón.
    },
  });

  // ----- Estados de carga / error -----
  if (bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white border border-sfyc-rojo rounded p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-sfyc-rojo mb-2">No se pudo cargar el examen</h1>
          <p className="text-gray-700 mb-4">
            {bootError?.message || 'Verifica que tengas un intento activo.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/estudiantes/examenes')}
            className="bg-igss-700 text-white px-4 py-2 rounded"
          >
            Volver a exámenes
          </button>
        </div>
      </div>
    );
  }

  if (!intento) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <span className="animate-pulse">Cargando intento…</span>
      </div>
    );
  }

  // ----- Pantalla bloqueada -----
  if (antiCheat.isLocked) {
    return <LockedScreen reason={antiCheat.lockReason || 'force_submit'} />;
  }

  // ----- Render principal -----
  const fullscreenRequired =
    Boolean(intento.fullscreen_obligatorio) && !antiCheat.fullscreen;

  const watermarkText = [
    user?.nombre || user?.nombre_completo || 'Estudiante',
    user?.dpi || user?.residente_id || user?.id || '—',
    new Date().toLocaleString('es-GT', { hour12: false }),
    `#${intento.intento_id}`,
  ].join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
      <Watermark text={watermarkText} token={intento.watermark_token} />

      {/* ---------- Header sticky ---------- */}
      <header className="bg-igss-800 text-white px-4 py-2 flex flex-wrap justify-between items-center gap-2 shadow z-50 relative">
        <div className="min-w-0">
          <span className="font-bold truncate block sm:inline">
            {intento.titulo || 'Examen'}
          </span>
          <span className="ml-0 sm:ml-3 text-sm opacity-80 block sm:inline">
            Pregunta {intentoState.currentN}/{intento.total_preguntas}
            {intentoState.answeredCount > 0 && (
              <> · respondidas {intentoState.answeredCount}</>
            )}
          </span>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Timer
            endsAt={intento.fecha_limite}
            serverNow={intento.server_now}
            onExpire={() => {
              antiCheat.reportIncident('TIME_EXCEEDED', 'ALTA');
              intentoState.submit({ forzado: true, motivo: 'time_exceeded' });
            }}
          />
          <StrikesIndicator
            current={antiCheat.strikes}
            max={intento.max_strikes || 3}
            score={antiCheat.score}
          />
          {!antiCheat.fullscreen && (
            <button
              type="button"
              onClick={antiCheat.requestFullscreen}
              className="bg-sfyc-rojo hover:bg-igss-red-dark px-3 py-1 rounded text-sm font-semibold"
            >
              ⚠️ Volver a pantalla completa
            </button>
          )}
        </div>
      </header>

      {/* Banner amarillo si fullscreen no obligatorio falta */}
      {!antiCheat.fullscreen && !intento.fullscreen_obligatorio && (
        <div className="bg-sfyc-amarillo text-igss-900 text-sm px-4 py-2 text-center">
          Estás fuera de pantalla completa. Cada salida cuenta como incidente.
        </div>
      )}

      {/* ---------- Contenido ---------- */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto w-full">
          {fullscreenRequired ? (
            <div className="bg-sfyc-amarillo border-2 border-sfyc-rojo rounded p-6 text-center">
              <h2 className="text-xl font-bold text-igss-900 mb-2">
                Pantalla completa requerida
              </h2>
              <p className="text-gray-800 mb-4">
                Este examen requiere pantalla completa para continuar. Haz clic en el
                botón para reactivarla.
              </p>
              <button
                type="button"
                onClick={antiCheat.requestFullscreen}
                className="bg-igss-700 hover:bg-igss-800 text-white font-bold px-5 py-2 rounded"
              >
                Activar pantalla completa
              </button>
            </div>
          ) : (
            <PreguntaView
              pregunta={intentoState.currentPregunta}
              respuesta={intentoState.respuestaActual}
              onChange={intentoState.saveRespuesta}
              disabled={false}
              onIncident={antiCheat.reportIncident}
              getElapsed={intentoState.getElapsed}
            />
          )}
        </div>
      </main>

      {/* ---------- Footer nav ---------- */}
      <footer className="border-t px-4 py-3 flex justify-between bg-gray-50 z-50 relative">
        <button
          type="button"
          onClick={intentoState.previo}
          disabled={intentoState.currentN <= 1 || fullscreenRequired}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        {intentoState.currentN < intento.total_preguntas ? (
          <button
            type="button"
            onClick={intentoState.siguiente}
            disabled={fullscreenRequired}
            className="bg-igss-700 hover:bg-igss-800 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={intentoState.confirmSubmit}
            disabled={fullscreenRequired || intentoState.submitting}
            className="bg-igss-600 hover:bg-igss-700 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
          >
            ✓ Finalizar examen
          </button>
        )}
      </footer>

      {/* ---------- Modales ---------- */}
      {antiCheat.showStrikeWarning && (
        <StrikeWarningModal
          strike={antiCheat.strikes}
          maxStrikes={intento.max_strikes || 3}
          latest={antiCheat.warnings[antiCheat.warnings.length - 1]}
          onClose={antiCheat.dismissWarning}
        />
      )}

      {intentoState.showSubmitConfirm && (
        <ConfirmSubmitModal
          answered={intentoState.answeredCount}
          total={intento.total_preguntas}
          onCancel={intentoState.cancelSubmit}
          onConfirm={() => intentoState.submit()}
          submitting={intentoState.submitting}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Modal interno — confirmación de envío
// ----------------------------------------------------------------------
function ConfirmSubmitModal({ answered, total, onCancel, onConfirm, submitting }) {
  const pendientes = Math.max(0, total - answered);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-igss-900 mb-2">¿Finalizar examen?</h2>
        <p className="text-gray-700 mb-4">
          Una vez enviado, no podrás modificar tus respuestas.
        </p>
        <div className="bg-gray-100 rounded p-3 text-sm mb-4 space-y-1">
          <div className="flex justify-between">
            <span>Respondidas:</span>
            <span className="font-semibold">
              {answered}/{total}
            </span>
          </div>
          {pendientes > 0 && (
            <div className="flex justify-between text-sfyc-rojo">
              <span>Pendientes:</span>
              <span className="font-semibold">{pendientes}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 bg-igss-600 hover:bg-igss-700 text-white px-4 py-2 rounded font-bold disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Sí, enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

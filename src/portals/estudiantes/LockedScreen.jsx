// src/portals/estudiantes/LockedScreen.jsx
//
// Pantalla full-cover que aparece cuando el intento se bloquea
// (3 strikes, devtools, force_submit, etc). Mensaje claro + único
// botón para volver al dashboard.

import { useNavigate } from 'react-router-dom';

const REASONS = {
  strikes_exceeded: {
    titulo: 'Examen bloqueado',
    mensaje:
      'Has alcanzado el máximo de strikes permitidos. Tu intento se envió automáticamente con las respuestas registradas hasta este momento.',
  },
  devtools_detected: {
    titulo: 'Examen bloqueado',
    mensaje:
      'Se detectó el uso de herramientas de desarrollador. Este incidente fue registrado y tu intento fue cerrado.',
  },
  force_submit: {
    titulo: 'Intento finalizado',
    mensaje:
      'El sistema cerró tu intento por un incidente crítico. Tus respuestas hasta el momento fueron guardadas.',
  },
  expirado: {
    titulo: 'Tiempo agotado',
    mensaje: 'El tiempo del examen finalizó. Tu intento fue cerrado automáticamente.',
  },
  default: {
    titulo: 'Examen finalizado',
    mensaje: 'Tu intento fue cerrado. Tus respuestas hasta el momento se guardaron.',
  },
};

export default function LockedScreen({ reason = 'default', detalle }) {
  const navigate = useNavigate();
  const info = REASONS[reason] || REASONS.default;

  const handleVolver = () => {
    // Salir de fullscreen si todavía estamos en él
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
    } catch {
      /* ignore */
    }
    navigate('/estudiantes', { replace: true });
  };

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-sfyc-rojo text-white p-6 animate-fade-in"
    >
      <div className="max-w-lg text-center space-y-5">
        <div className="text-6xl" aria-hidden="true">
          🔒
        </div>
        <h1 className="text-3xl font-bold">{info.titulo}</h1>
        <p className="text-lg leading-relaxed">{info.mensaje}</p>
        {detalle && (
          <p className="text-sm bg-black/20 rounded p-3 font-mono text-left">
            {String(detalle)}
          </p>
        )}
        <p className="text-sm opacity-80">
          Si crees que esto fue un error, comunícate con tu coordinador docente.
        </p>
        <button
          type="button"
          onClick={handleVolver}
          className="mt-2 bg-white text-sfyc-rojo font-bold px-6 py-3 rounded-lg shadow hover:bg-gray-100 transition-colors"
        >
          Volver al dashboard
        </button>
      </div>
    </div>
  );
}

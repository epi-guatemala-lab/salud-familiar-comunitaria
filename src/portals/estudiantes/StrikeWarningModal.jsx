// src/portals/estudiantes/StrikeWarningModal.jsx
//
// Modal que aparece tras un strike (incidente medio/alto). Tiene un
// countdown de 5 segundos antes de habilitar el botón "Entendido"
// para evitar que el estudiante lo cierre instintivamente sin leer.

import { useEffect, useState } from 'react';
import { describeIncidente } from '../../lib/anticheat-incident-types';

const COOLDOWN_SECONDS = 5;

export default function StrikeWarningModal({
  strike = 0,
  maxStrikes = 3,
  latest,
  onClose,
}) {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    setSecondsLeft(COOLDOWN_SECONDS);
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [strike, latest?.ts]);

  const tipo = latest?.tipo;
  const motivoMsg = tipo ? describeIncidente(tipo) : 'Posible intento de trampa detectado';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="strike-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 animate-fade-in p-4"
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border-4 border-sfyc-amarillo">
        <div className="bg-sfyc-amarillo px-5 py-3 flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            ⚠️
          </span>
          <h2 id="strike-modal-title" className="text-lg font-bold text-igss-900">
            Advertencia: incidente registrado
          </h2>
        </div>
        <div className="px-5 py-4 text-gray-800 space-y-3">
          <p>
            <span className="font-semibold">{motivoMsg}.</span> Este evento se registró en
            tu intento.
          </p>
          <div className="bg-gray-100 border border-gray-300 rounded p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span>Strike actual:</span>
              <span className="font-bold text-sfyc-rojo">
                {strike} / {maxStrikes}
              </span>
            </div>
            {latest?.severidad && (
              <div className="flex justify-between">
                <span>Severidad:</span>
                <span className="font-bold">
                  {String(latest.severidad).toUpperCase() === 'CRITICA'
                    ? 'CRÍTICA'
                    : latest.severidad}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Si alcanzas <strong>{maxStrikes} strikes</strong> tu examen será enviado
            automáticamente con las respuestas que tengas hasta el momento. Mantén la
            ventana en pantalla completa y no salgas del examen.
          </p>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={secondsLeft > 0}
            className="bg-igss-700 hover:bg-igss-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded transition-colors"
          >
            {secondsLeft > 0 ? `Entendido (${secondsLeft})` : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
}

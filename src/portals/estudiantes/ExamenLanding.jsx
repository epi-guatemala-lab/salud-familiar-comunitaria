// src/portals/estudiantes/ExamenLanding.jsx
//
// Pantalla pre-inicio del examen (doc 05 §F.2). Muestra reglas,
// pide aceptación de 4 checkboxes, resuelve el PoW si aplica, llama
// POST /api/estudiante/intentos/start, activa fullscreen y navega
// al runner.

import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useFingerprint } from '../../hooks/useFingerprint';
import { useFullscreen } from '../../hooks/useFullscreen';
import { api } from '../../lib/api';
import { solvePoW } from '../../lib/anticheat-pow';

const MODOS = {
  LAXO: { label: 'Laxo', color: 'bg-igss-200 text-igss-900', icon: '🟢' },
  NORMAL: { label: 'Normal', color: 'bg-sfyc-amarillo text-igss-900', icon: '🟡' },
  ESTRICTO: { label: 'Estricto', color: 'bg-sfyc-rojo text-white', icon: '🔴' },
};

export default function ExamenLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: examen, loading, error } = useApi(`/api/estudiante/examenes/${id}`);
  const fingerprint = useFingerprint();
  const { requestFullscreen, isSupported: fsSupported } = useFullscreen();

  const [acks, setAcks] = useState({
    rules: false,
    fs: false,
    env: false,
    net: false,
  });
  const [starting, setStarting] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [powProgress, setPowProgress] = useState(null);

  const allChecked = Object.values(acks).every(Boolean);

  const toggle = (key) => setAcks((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleStart = async () => {
    if (!allChecked || starting) return;
    setStarting(true);
    setBootError(null);
    try {
      // 1. PoW si aplica
      let powSolution = null;
      if (examen?.pow_difficulty > 0) {
        setPowProgress('Validando dispositivo…');
        const seed = examen.pow_seed || `examen-${id}-${Date.now()}`;
        powSolution = await solvePoW(seed, examen.pow_difficulty);
        setPowProgress(null);
      }

      // 2. Fingerprint
      const fpHash = await fingerprint.toString();
      const fpFull = fingerprint.toJSON?.() || null;

      // 3. POST start
      const intento = await api.post('/api/estudiante/intentos/start', {
        examen_id: Number(id),
        fingerprint: fpHash,
        fingerprint_full: fpFull,
        pow_solution: powSolution,
        accept_terms: true,
      });

      // 4. Fullscreen (debe ser dentro del user-gesture del click)
      if (intento.fullscreen_obligatorio !== false) {
        const ok = await requestFullscreen();
        if (!ok && intento.modo === 'ESTRICTO') {
          throw new Error(
            'Tu navegador no permitió pantalla completa. El examen estricto la requiere.'
          );
        }
      }

      // 5. Navegar al runner pasando el intento por router state
      navigate(`/estudiantes/examenes/${id}/runner`, { state: { intento } });
    } catch (err) {
      setBootError(err?.message || 'Error iniciando el examen');
      setStarting(false);
      setPowProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <span className="animate-pulse">Cargando examen…</span>
      </div>
    );
  }

  if (error || !examen) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
        <h1 className="text-xl font-bold text-sfyc-rojo">No se pudo cargar el examen</h1>
        <p className="text-gray-700 mt-2">{error?.message || 'No encontrado.'}</p>
        <Link to="/estudiantes/examenes" className="text-igss-700 underline mt-4 inline-block">
          ← Volver a exámenes
        </Link>
      </div>
    );
  }

  const modoInfo = MODOS[examen.modo] || MODOS.NORMAL;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 bg-igss-700 text-white">
          <h1 className="text-2xl font-bold">{examen.titulo}</h1>
          {examen.descripcion && (
            <p className="text-igss-100 mt-1 text-sm">{examen.descripcion}</p>
          )}
        </header>

        {/* Info del examen */}
        <section className="px-6 py-4 border-b">
          <h2 className="font-bold text-igss-900 mb-3 flex items-center gap-2">
            <span aria-hidden="true">📋</span> Información del examen
          </h2>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>
              • Total de preguntas: <strong>{examen.total_preguntas}</strong>
            </li>
            <li>
              • Duración: <strong>{examen.duracion_minutos} minutos</strong>
            </li>
            <li>
              • Modo:{' '}
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${modoInfo.color}`}
              >
                {modoInfo.icon} {modoInfo.label}
              </span>
            </li>
            <li>
              • Intentos:{' '}
              <strong>
                {examen.max_intentos || 1}
                {(examen.max_intentos || 1) === 1 ? ' (no repetible)' : ''}
              </strong>
            </li>
            {examen.fecha_cierre && (
              <li>
                • Cierre:{' '}
                <strong>
                  {new Date(examen.fecha_cierre).toLocaleString('es-GT', { hour12: false })}
                </strong>
              </li>
            )}
          </ul>
        </section>

        {/* Reglas */}
        <section className="px-6 py-4 border-b bg-igss-50">
          <h2 className="font-bold text-igss-900 mb-3 flex items-center gap-2">
            <span aria-hidden="true">⚠️</span> Reglas importantes
          </h2>
          <ul className="space-y-1 text-sm text-gray-800">
            {examen.fullscreen_obligatorio !== false && (
              <li>• Pantalla completa será forzada durante el examen.</li>
            )}
            <li>• Cambiar de pestaña/ventana se cuenta como incidente.</li>
            <li>• Copiar y pegar están bloqueados.</li>
            <li>• Las herramientas de desarrollador serán detectadas.</li>
            <li>
              • <strong>{examen.max_strikes || 3} strikes</strong> activan el envío
              automático del examen con las respuestas registradas.
            </li>
            <li>• El examen no se puede pausar.</li>
          </ul>
          {!fsSupported && examen.fullscreen_obligatorio !== false && (
            <p className="mt-3 text-sm bg-sfyc-amarillo/30 border border-sfyc-amarillo p-2 rounded">
              Tu navegador no soporta pantalla completa. Si el examen es modo ESTRICTO no
              podrás iniciarlo.
            </p>
          )}
        </section>

        {/* Acks */}
        <section className="px-6 py-4 border-b">
          <h2 className="font-bold text-igss-900 mb-3">Confirma para continuar</h2>
          <div className="space-y-2">
            <Ack
              checked={acks.rules}
              onChange={() => toggle('rules')}
              label="He leído y entiendo las reglas"
            />
            <Ack
              checked={acks.fs}
              onChange={() => toggle('fs')}
              label="Acepto activar pantalla completa"
            />
            <Ack
              checked={acks.env}
              onChange={() => toggle('env')}
              label="Confirmo que estoy en un lugar tranquilo y sin distracciones"
            />
            <Ack
              checked={acks.net}
              onChange={() => toggle('net')}
              label="Mi conexión a internet es estable"
            />
          </div>
        </section>

        {/* Acciones */}
        <footer className="px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-between items-center">
          <Link
            to="/estudiantes/examenes"
            className="text-igss-700 hover:underline text-sm"
          >
            ← Volver
          </Link>
          <button
            type="button"
            onClick={handleStart}
            disabled={!allChecked || starting}
            className="bg-igss-700 hover:bg-igss-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded shadow w-full sm:w-auto"
          >
            {starting ? powProgress || 'Iniciando…' : 'Iniciar examen →'}
          </button>
        </footer>

        {bootError && (
          <div className="px-6 pb-4 -mt-2">
            <div className="bg-sfyc-rojo/10 border border-sfyc-rojo text-sfyc-rojo text-sm p-3 rounded">
              {bootError}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Ack({ checked, onChange, label }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-800 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 text-igss-700 rounded"
      />
      <span>{label}</span>
    </label>
  );
}

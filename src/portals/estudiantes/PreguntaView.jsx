// src/portals/estudiantes/PreguntaView.jsx
//
// Render de una pregunta según su `tipo`: MCQ, MULTIPLE, VF, ABIERTA,
// ORDENAR (stub simple). Bloquea copy/paste/cut/contextmenu en los
// inputs y reporta los intentos al backend a través de `onIncident`.

import { useEffect, useMemo, useRef, useState } from 'react';

function preventClipboard(e) {
  e.preventDefault();
  return false;
}

const NO_AUTOCOMPLETE = {
  autoComplete: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  autoCapitalize: 'off',
};

export default function PreguntaView({
  pregunta,
  respuesta,
  onChange,
  disabled = false,
  onIncident,
  getElapsed,
}) {
  if (!pregunta) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <span className="animate-pulse">Cargando pregunta…</span>
      </div>
    );
  }

  const elapsed = () => (typeof getElapsed === 'function' ? getElapsed() : 0);
  const reportPaste = (extra = {}) => {
    onIncident?.('PASTE_ATTEMPT', 'ALTA', { pregunta_id: pregunta.id, ...extra });
  };
  const reportTooFast = (extra = {}) => {
    onIncident?.('TYPE_TOO_FAST', 'MEDIA', { pregunta_id: pregunta.id, ...extra });
  };
  const reportPasteLike = (extra = {}) => {
    onIncident?.('PASTE_LIKE', 'ALTA', { pregunta_id: pregunta.id, ...extra });
  };

  return (
    <div
      className={disabled ? 'opacity-50 pointer-events-none select-none' : ''}
      data-pregunta-id={pregunta.id}
    >
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-igss-900">
          {pregunta.orden_en_intento || pregunta.numero || '?'}.{' '}
          {pregunta.enunciado}
        </h2>
        {pregunta.enunciado_imagen_url && (
          <img
            src={pregunta.enunciado_imagen_url}
            alt="Material visual de la pregunta"
            className="max-w-full mt-3 rounded shadow-sm border"
          />
        )}
      </header>

      {pregunta.tipo === 'MCQ' && (
        <McqRender
          pregunta={pregunta}
          respuesta={respuesta}
          onChange={onChange}
          elapsed={elapsed}
        />
      )}

      {pregunta.tipo === 'MULTIPLE' && (
        <MultipleRender
          pregunta={pregunta}
          respuesta={respuesta}
          onChange={onChange}
          elapsed={elapsed}
        />
      )}

      {pregunta.tipo === 'VF' && (
        <VfRender
          pregunta={pregunta}
          respuesta={respuesta}
          onChange={onChange}
          elapsed={elapsed}
        />
      )}

      {pregunta.tipo === 'ABIERTA' && (
        <AbiertaRender
          pregunta={pregunta}
          respuesta={respuesta}
          onChange={onChange}
          elapsed={elapsed}
          onPasteIncident={reportPaste}
          onTooFastIncident={reportTooFast}
          onPasteLikeIncident={reportPasteLike}
        />
      )}

      {pregunta.tipo === 'ORDENAR' && (
        <OrdenarRender
          pregunta={pregunta}
          respuesta={respuesta}
          onChange={onChange}
          elapsed={elapsed}
        />
      )}

      <footer className="text-xs text-gray-500 mt-4 flex justify-between">
        <span>Puntaje: {pregunta.puntaje ?? '—'}</span>
        {respuesta && (
          <span className="text-igss-700 font-medium">✓ Respuesta guardada</span>
        )}
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------------
// MCQ — opción única (radios)
// ----------------------------------------------------------------------
function McqRender({ pregunta, respuesta, onChange, elapsed }) {
  const selectedLetra = respuesta?.opciones?.[0];
  return (
    <div className="space-y-2">
      {(pregunta.opciones || []).map((o) => {
        const checked = selectedLetra === o.letra;
        return (
          <label
            key={o.letra}
            className={`flex items-start gap-3 border rounded p-3 cursor-pointer transition-colors hover:bg-igss-50
              ${checked ? 'bg-igss-100 border-igss-500' : 'bg-white border-gray-300'}`}
          >
            <input
              type="radio"
              name={`p${pregunta.id}`}
              checked={checked}
              onChange={() =>
                onChange(pregunta.id, { opciones: [o.letra], tiempo: elapsed() })
              }
              onCopy={preventClipboard}
              onPaste={preventClipboard}
              onCut={preventClipboard}
              className="mt-1"
            />
            <span>
              <span className="font-bold mr-2">{o.letra}.</span>
              {o.texto}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// MULTIPLE — checkboxes
// ----------------------------------------------------------------------
function MultipleRender({ pregunta, respuesta, onChange, elapsed }) {
  const selected = respuesta?.opciones || [];
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-1">Selecciona todas las opciones que correspondan.</p>
      {(pregunta.opciones || []).map((o) => {
        const checked = selected.includes(o.letra);
        return (
          <label
            key={o.letra}
            className={`flex items-start gap-3 border rounded p-3 cursor-pointer hover:bg-igss-50
              ${checked ? 'bg-igss-100 border-igss-500' : 'bg-white border-gray-300'}`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, o.letra]
                  : selected.filter((x) => x !== o.letra);
                onChange(pregunta.id, { opciones: next, tiempo: elapsed() });
              }}
              onCopy={preventClipboard}
              onPaste={preventClipboard}
              onCut={preventClipboard}
              className="mt-1"
            />
            <span>
              <span className="font-bold mr-2">{o.letra}.</span>
              {o.texto}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// VF — Verdadero / Falso (botones grandes)
// ----------------------------------------------------------------------
function VfRender({ pregunta, respuesta, onChange, elapsed }) {
  const value = respuesta?.texto;
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange(pregunta.id, { texto: 'V', tiempo: elapsed() })}
        className={`flex-1 py-4 rounded text-lg font-semibold transition-colors ${
          value === 'V'
            ? 'bg-igss-700 text-white shadow'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        ✓ Verdadero
      </button>
      <button
        type="button"
        onClick={() => onChange(pregunta.id, { texto: 'F', tiempo: elapsed() })}
        className={`flex-1 py-4 rounded text-lg font-semibold transition-colors ${
          value === 'F'
            ? 'bg-sfyc-rojo text-white shadow'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        ✗ Falso
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// ABIERTA — textarea con anti-paste y detección de tecleo anormal
// ----------------------------------------------------------------------
function AbiertaRender({
  pregunta,
  respuesta,
  onChange,
  elapsed,
  onPasteIncident,
  onTooFastIncident,
  onPasteLikeIncident,
}) {
  const lastInputRef = useRef({ ts: 0, len: 0 });
  const value = respuesta?.texto || '';

  const handleInput = (e) => {
    const newVal = e.target.value;
    const now = Date.now();
    const dl = newVal.length - (lastInputRef.current.len || 0);
    const dt = now - (lastInputRef.current.ts || now);

    // Heurística C.15: 80+ chars en un solo input event = paste-like
    if (dl > 80 && dt < 100) {
      onPasteLikeIncident?.({ chars_added: dl, ms: dt });
    } else if (dt > 0 && dt < 30 && dl > 5) {
      // Tecleo imposiblemente rápido: <30ms entre eventos y >5 chars
      onTooFastIncident?.({ ms: dt, chars: dl });
    }

    lastInputRef.current = { ts: now, len: newVal.length };
    onChange(pregunta.id, { texto: newVal, tiempo: elapsed() });
  };

  return (
    <textarea
      value={value}
      onChange={handleInput}
      onCopy={preventClipboard}
      onPaste={(e) => {
        e.preventDefault();
        onPasteIncident?.();
      }}
      onCut={preventClipboard}
      onContextMenu={preventClipboard}
      className="w-full border border-gray-300 rounded p-3 min-h-[8rem] focus:ring-2 focus:ring-igss-500 focus:outline-none"
      maxLength={pregunta.max_chars || 5000}
      placeholder="Escribe tu respuesta aquí…"
      {...NO_AUTOCOMPLETE}
    />
  );
}

// ----------------------------------------------------------------------
// ORDENAR — versión simple (botones up/down). Drag-drop completo TODO.
// ----------------------------------------------------------------------
function OrdenarRender({ pregunta, respuesta, onChange, elapsed }) {
  const initial = useMemo(() => {
    if (Array.isArray(respuesta?.opciones) && respuesta.opciones.length) {
      return respuesta.opciones;
    }
    return (pregunta.opciones || []).map((o) => o.letra);
  }, [pregunta.opciones, respuesta?.opciones]);

  const [orden, setOrden] = useState(initial);

  useEffect(() => {
    setOrden(initial);
  }, [initial]);

  const move = (idx, delta) => {
    const next = [...orden];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrden(next);
    onChange(pregunta.id, { opciones: next, tiempo: elapsed() });
  };

  const lookup = Object.fromEntries((pregunta.opciones || []).map((o) => [o.letra, o.texto]));

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-2">
        Ordena las opciones usando los botones ▲ / ▼.
      </p>
      {orden.map((letra, idx) => (
        <div
          key={letra}
          className="flex items-center gap-2 border rounded p-3 bg-white"
        >
          <span className="font-bold text-igss-700 w-6">{idx + 1}.</span>
          <span className="flex-1">{lookup[letra] || letra}</span>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="px-2 py-0.5 bg-gray-200 rounded disabled:opacity-30"
              aria-label="Subir"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === orden.length - 1}
              className="px-2 py-0.5 bg-gray-200 rounded disabled:opacity-30"
              aria-label="Bajar"
            >
              ▼
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// src/hooks/useExamenIntento.js
//
// Estado de un intento en curso (lado cliente).
//
// Responsabilidades:
//   - Cargar la pregunta N bajo demanda (cache local con TTL implícito).
//   - Mantener cache de respuestas por preguntaId.
//   - Autosave debounced contra
//       POST /api/estudiante/intentos/{id}/responder
//   - Navegación previo/siguiente con prefetch silencioso de la próxima.
//   - Confirmación de submit + envío.
//
// La fuente de verdad sigue siendo el backend: si el browser pierde
// estado (refresh, crash) el endpoint pregunta N devuelve `respuesta_actual`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useDebouncedCallback } from './useDebouncedCallback';

export function useExamenIntento(intentoId, intentoMeta) {
  const totalPreguntas = intentoMeta?.total_preguntas || 0;
  const examenId = intentoMeta?.examen_id;

  const [currentN, setCurrentN] = useState(1);
  const [preguntaCache, setPreguntaCache] = useState({}); // { N: preguntaObj }
  const [respuestasCache, setRespuestasCache] = useState({}); // { preguntaId: { texto/opciones, tiempo } }
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const startTimesRef = useRef({}); // { N: ts when shown }
  const navigate = useNavigate();

  // Helper: tiempo desde que se mostró la pregunta actual
  const getElapsed = useCallback(() => {
    const start = startTimesRef.current[currentN];
    if (!start) return 0;
    return Math.floor((Date.now() - start) / 1000);
  }, [currentN]);

  // ----- Cargar pregunta N (con prefetch silencioso de la siguiente) -----
  const loadPregunta = useCallback(
    async (n) => {
      if (!intentoId) return;
      if (preguntaCache[n]) return; // ya está
      try {
        const p = await api.get(`/api/estudiante/intentos/${intentoId}/pregunta/${n}`);
        setPreguntaCache((c) => ({ ...c, [n]: p }));
        if (p?.respuesta_actual) {
          setRespuestasCache((r) => ({ ...r, [p.id]: p.respuesta_actual }));
        }
      } catch (err) {
        setError(err);
      }
    },
    [intentoId, preguntaCache]
  );

  useEffect(() => {
    loadPregunta(currentN);
    // Marcar tiempo de inicio si todavía no se ha registrado
    if (!startTimesRef.current[currentN]) {
      startTimesRef.current[currentN] = Date.now();
    }
    // Prefetch silencioso de la siguiente pregunta para reducir latencia perceptible
    if (currentN + 1 <= totalPreguntas) {
      loadPregunta(currentN + 1);
    }
  }, [currentN, totalPreguntas, loadPregunta]);

  // ----- Autosave debounced -----
  const saveOnServer = useDebouncedCallback(async (preguntaId, respuesta) => {
    if (!intentoId || !preguntaId) return;
    try {
      await api.post(`/api/estudiante/intentos/${intentoId}/responder`, {
        pregunta_id: preguntaId,
        respuesta_texto: respuesta?.texto ?? null,
        respuesta_opciones: respuesta?.opciones ?? null,
        tiempo_segundos: respuesta?.tiempo ?? 0,
      });
    } catch (err) {
      // TODO: encolar offline si la red falla — por ahora, swallowed con log.
      // eslint-disable-next-line no-console
      console.warn('autosave fail', err);
    }
  }, 500);

  const saveRespuesta = useCallback(
    (preguntaId, respuesta) => {
      const merged = {
        texto: respuesta?.texto ?? null,
        opciones: respuesta?.opciones ?? null,
        tiempo: respuesta?.tiempo ?? getElapsed(),
      };
      setRespuestasCache((r) => ({ ...r, [preguntaId]: merged }));
      saveOnServer(preguntaId, merged);
    },
    [saveOnServer, getElapsed]
  );

  const siguiente = useCallback(() => {
    setCurrentN((n) => Math.min(n + 1, totalPreguntas));
  }, [totalPreguntas]);

  const previo = useCallback(() => {
    setCurrentN((n) => Math.max(n - 1, 1));
  }, []);

  const goTo = useCallback(
    (n) => {
      if (n >= 1 && n <= totalPreguntas) setCurrentN(n);
    },
    [totalPreguntas]
  );

  const confirmSubmit = useCallback(() => setShowSubmitConfirm(true), []);
  const cancelSubmit = useCallback(() => setShowSubmitConfirm(false), []);

  const submit = useCallback(
    async (extra = {}) => {
      if (!intentoId || submitting || submitted) return null;
      setSubmitting(true);
      // Asegurar que el último autosave haya hecho flush
      try {
        saveOnServer.flush?.();
      } catch {
        /* ignore */
      }
      try {
        const res = await api.post(`/api/estudiante/intentos/${intentoId}/enviar`, {
          confirmacion: 'ENVIAR',
          ...extra,
        });
        setSubmitted(true);
        setShowSubmitConfirm(false);
        // Navegar al resumen
        if (examenId) {
          navigate(`/estudiantes/examenes/${examenId}/resumen`, {
            state: { intentoId, resultado: res },
          });
        }
        return res;
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [intentoId, examenId, navigate, submitting, submitted, saveOnServer]
  );

  const currentPregunta = preguntaCache[currentN] || null;
  const respuestaActual = currentPregunta ? respuestasCache[currentPregunta.id] : null;
  const answeredCount = Object.keys(respuestasCache).filter((pid) => {
    const r = respuestasCache[pid];
    return r && (r.texto || (r.opciones && r.opciones.length > 0));
  }).length;

  return {
    currentN,
    currentPregunta,
    respuestaActual,
    answeredCount,
    totalPreguntas,
    siguiente,
    previo,
    goTo,
    saveRespuesta,
    confirmSubmit,
    cancelSubmit,
    submit,
    showSubmitConfirm,
    submitted,
    submitting,
    error,
    getElapsed,
  };
}

export default useExamenIntento;

// src/hooks/useHeartbeat.js
//
// Mantiene la sesión de un intento viva pinging
//   POST /api/estudiante/intentos/{id}/keepalive
// cada `intervalMs` (default 30s). El backend responde con
// `{ ok, restante, suspicion_score, strikes_count, action }` y le
// permite al cliente:
//   - Sincronizar el contador local con el deadline server-side.
//   - Detectar `action === 'FORCE_SUBMIT'` (envío forzoso).
//   - Detectar 410 Gone (intento expirado/cancelado).
//
// Se PAUSA automáticamente si:
//   - el documento está oculto (visibility hidden) por más de 2 min
//     (igual lo despierta apenas vuelva el foco)
//   - `enabled === false`
//   - el intento ya está locked
//
// Si el ping falla N veces seguidas → reporta `HEARTBEAT_LOST`.

import { useEffect, useRef } from 'react';
import { api } from '../lib/api';

const DEFAULT_INTERVAL_MS = 30_000;
const MAX_FAILURES_BEFORE_REPORT = 2;

export function useHeartbeat({
  intentoId,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
  fingerprintHash = null,
  csrfToken = null,
  onTick = null,
  onForceSubmit = null,
  onExpired = null,
  onConnectionLost = null,
} = {}) {
  const failuresRef = useRef(0);
  // Evita reportar HEARTBEAT_LOST en cada tick fallido subsiguiente.
  // Antes: 4 fallos → 4 strikes en 2 minutos → auto-submit por strikes.
  // Ahora: solo dispara una vez al cruzar el umbral; se resetea al éxito.
  const reportedLostRef = useRef(false);
  const lockedRef = useRef(false);
  const onTickRef = useRef(onTick);
  const onForceSubmitRef = useRef(onForceSubmit);
  const onExpiredRef = useRef(onExpired);
  const onConnectionLostRef = useRef(onConnectionLost);

  // Mantener refs actualizados sin reiniciar el interval.
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    onForceSubmitRef.current = onForceSubmit;
  }, [onForceSubmit]);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);
  useEffect(() => {
    onConnectionLostRef.current = onConnectionLost;
  }, [onConnectionLost]);

  useEffect(() => {
    if (!enabled || !intentoId) return undefined;
    lockedRef.current = false;
    failuresRef.current = 0;
    reportedLostRef.current = false;

    let cancelled = false;
    let timer = null;

    async function ping() {
      if (cancelled || lockedRef.current) return;
      try {
        const resp = await api.post(
          `/api/estudiante/intentos/${intentoId}/keepalive`,
          { ts: Date.now(), fingerprint: fingerprintHash || undefined },
          { headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined }
        );
        failuresRef.current = 0;
        reportedLostRef.current = false;
        onTickRef.current?.(resp);
        if (resp?.action === 'FORCE_SUBMIT') {
          lockedRef.current = true;
          onForceSubmitRef.current?.(resp.reason || 'force_submit');
        }
      } catch (err) {
        const status = err?.status || err?.response?.status;
        if (status === 410) {
          lockedRef.current = true;
          onExpiredRef.current?.(err);
          return;
        }
        failuresRef.current += 1;
        if (
          failuresRef.current >= MAX_FAILURES_BEFORE_REPORT
          && !reportedLostRef.current
        ) {
          reportedLostRef.current = true;
          onConnectionLostRef.current?.(err);
        }
      }
    }

    // Primer tick "rápido" tras 5s para validar la sesión inmediatamente.
    const initial = setTimeout(ping, 5_000);
    timer = setInterval(ping, intervalMs);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timer) clearInterval(timer);
    };
  }, [intentoId, enabled, intervalMs, fingerprintHash, csrfToken]);
}

export default useHeartbeat;

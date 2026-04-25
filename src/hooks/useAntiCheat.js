// src/hooks/useAntiCheat.js
//
// Hook central del subsistema anti-trampa para exámenes.
// Implementa todas las medidas listadas en doc 02 §C:
//   - Fullscreen handshake (C.06)
//   - Blur / visibilitychange (C.07)
//   - Copy / paste / cut / contextmenu (C.08)
//   - Forbidden keys (C.09)
//   - DevTools detection (C.13)
//   - Heartbeat 30s (extra)
//   - beforeunload guard (extra)
//
// Devuelve estado: { strikes, score, fullscreen, warnings, isLocked,
//   fingerprint, showStrikeWarning }
// Y callbacks: { requestFullscreen, reportIncident, dismissWarning }
//
// Inputs:
//   - intentoId
//   - csrfToken
//   - config: { modo, max_strikes, fullscreen_obligatorio, ... }
//   - onAutoSubmit(reason) — callback cuando llega FORCE_SUBMIT del server
//   - onLock(reason) — callback cuando se bloquea localmente
//   - onWarning(warning) — opcional, cuando se acumula un nuevo warning
//
// IMPORTANTE: cleanup obligatorio de TODOS los listeners en unmount
// para evitar memory leaks (ya implementado en cada useEffect).

import { useCallback, useEffect, useRef, useState } from 'react';
import { generateFingerprint } from './useFingerprint';
import { useHeartbeat } from './useHeartbeat';
import { api } from '../lib/api';
import {
  describeIncidente,
  esTipoValido,
  severidadPorDefecto,
} from '../lib/anticheat-incident-types';

const DEDUP_WINDOW_MS = 2000;
const DEVTOOLS_POLL_MS = 1500;
const DEVTOOLS_THRESHOLD_PX = 200;

export function useAntiCheat({
  intentoId,
  csrfToken,
  config = {},
  onAutoSubmit,
  onLock,
  onWarning,
} = {}) {
  const {
    modo = 'NORMAL',
    max_strikes: maxStrikes = 3,
    fullscreen_obligatorio: fullscreenObligatorio = true,
  } = config;

  const enabled = modo !== 'LAXO';

  const [strikes, setStrikes] = useState(0);
  const [score, setScore] = useState(0);
  const [fullscreen, setFullscreen] = useState(() =>
    Boolean(document.fullscreenElement || document.webkitFullscreenElement)
  );
  const [warnings, setWarnings] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [showStrikeWarning, setShowStrikeWarning] = useState(false);

  // Refs auxiliares (no disparan re-renders)
  const lastIncidentRef = useRef({});
  const blurStartRef = useRef(null);
  const enabledRef = useRef(enabled);
  const intentoIdRef = useRef(intentoId);
  const csrfRef = useRef(csrfToken);
  const isLockedRef = useRef(false);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onLockRef = useRef(onLock);
  const onWarningRef = useRef(onWarning);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    intentoIdRef.current = intentoId;
  }, [intentoId]);
  useEffect(() => {
    csrfRef.current = csrfToken;
  }, [csrfToken]);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);
  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);
  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);
  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  // ----- Fingerprint inicial -----
  useEffect(() => {
    let alive = true;
    generateFingerprint().then((fp) => {
      if (alive) setFingerprint(fp);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ----- Reportar incidente al backend -----
  const reportIncident = useCallback(
    async (tipo, severidad, context = {}) => {
      // Aceptamos siempre TIME_EXCEEDED y AUTO_SUBMIT_* aunque modo == LAXO.
      const passthrough = tipo === 'TIME_EXCEEDED' || tipo?.startsWith?.('AUTO_SUBMIT');
      if (!enabledRef.current && !passthrough) return null;
      if (!intentoIdRef.current) return null;

      // Validar tipo (no cortar — backend tiene última palabra, pero
      // así evitamos enviar typos accidentales).
      if (!esTipoValido(tipo)) {
        // eslint-disable-next-line no-console
        console.warn(`[anti-cheat] tipo desconocido: ${tipo}`);
      }

      const sev = severidad || severidadPorDefecto(tipo);

      // Dedup por (tipo, severidad) en ventana de 2s
      const key = `${tipo}::${sev}`;
      const now = Date.now();
      if (
        lastIncidentRef.current[key] &&
        now - lastIncidentRef.current[key] < DEDUP_WINDOW_MS
      ) {
        return null;
      }
      lastIncidentRef.current[key] = now;

      try {
        const resp = await api.post(
          `/api/estudiante/intentos/${intentoIdRef.current}/incidente`,
          { tipo, severidad: sev, context, ts: now },
          {
            headers: csrfRef.current ? { 'X-CSRF-Token': csrfRef.current } : undefined,
          }
        );

        if (typeof resp?.strikes_count === 'number') {
          setStrikes(resp.strikes_count);
        } else if (typeof resp?.strikes === 'number') {
          setStrikes(resp.strikes);
        }
        if (typeof resp?.suspicion_score === 'number') {
          setScore(resp.suspicion_score);
        } else if (typeof resp?.score === 'number') {
          setScore(resp.score);
        }

        const warning = {
          tipo,
          severidad: sev,
          ts: now,
          msg: describeIncidente(tipo),
          context,
        };
        setWarnings((w) => [...w.slice(-9), warning]);
        onWarningRef.current?.(warning);

        // Mostrar modal de strike warning automáticamente para tipos que
        // suelen incrementar el contador de strikes.
        if (sev === 'ALTA' || sev === 'CRITICA' || sev === 'MEDIA') {
          setShowStrikeWarning(true);
        }

        if (resp?.action === 'FORCE_SUBMIT' || resp?.accion === 'FORCE_SUBMIT') {
          isLockedRef.current = true;
          setIsLocked(true);
          setLockReason(resp.reason || resp.razon || 'force_submit');
          onLockRef.current?.(resp.reason || resp.razon || 'force_submit');
          onAutoSubmitRef.current?.(resp.reason || resp.razon || 'force_submit');
        }

        return resp;
      } catch (err) {
        // No tirar — los incidentes son best-effort, pero loguear.
        // eslint-disable-next-line no-console
        console.warn('[anti-cheat] reportIncident error', tipo, err);
        return null;
      }
    },
    []
  );

  // ----- Fullscreen handshake -----
  const requestFullscreen = useCallback(async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else {
        throw new Error('FullscreenNotSupported');
      }
      return true;
    } catch (err) {
      reportIncident('FULLSCREEN_FAIL', 'BAJA', { error: String(err) });
      return false;
    }
  }, [reportIncident]);

  // Listener de cambios de fullscreen
  useEffect(() => {
    const handler = () => {
      const isFs = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      setFullscreen(isFs);
      if (!isFs && !isLockedRef.current && enabledRef.current && fullscreenObligatorio) {
        reportIncident('FULLSCREEN_EXIT', 'MEDIA');
      }
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [reportIncident, fullscreenObligatorio]);

  // ----- Blur / focus / visibility -----
  useEffect(() => {
    if (!enabled) return undefined;
    const onBlur = () => {
      blurStartRef.current = Date.now();
    };
    const onFocus = () => {
      if (blurStartRef.current) {
        const dur = Date.now() - blurStartRef.current;
        const sev = dur > 30_000 ? 'ALTA' : 'BAJA';
        reportIncident('BLUR', sev, { duration_ms: dur });
        blurStartRef.current = null;
      }
    };
    const onVis = () => {
      if (document.hidden) reportIncident('VISIBILITY_HIDDEN', 'MEDIA');
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, reportIncident]);

  // ----- Copy / paste / cut / contextmenu -----
  useEffect(() => {
    if (!enabled) return undefined;
    const handlers = {};
    const events = ['copy', 'cut', 'paste', 'contextmenu'];
    events.forEach((ev) => {
      handlers[ev] = (e) => {
        // Permitir paste/copy en elementos con data-allow-paste
        if (e.target?.closest?.('[data-allow-paste]')) return;
        e.preventDefault();
        const tipo = ev === 'contextmenu' ? 'CONTEXTMENU' : `${ev.toUpperCase()}_ATTEMPT`;
        const sev = ev === 'contextmenu' ? 'BAJA' : 'ALTA';
        reportIncident(tipo, sev, { tag: e.target?.tagName || 'unknown' });
      };
      document.addEventListener(ev, handlers[ev]);
    });
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handlers[ev]));
    };
  }, [enabled, reportIncident]);

  // ----- Forbidden keys (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+P, Ctrl+S, Cmd+P/S) -----
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      const k = e.key?.toUpperCase?.() || '';
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k)) ||
        (e.ctrlKey && ['U', 'P', 'S'].includes(k)) ||
        (e.metaKey && ['P', 'S'].includes(k));
      if (blocked) {
        e.preventDefault();
        reportIncident('FORBIDDEN_KEY', 'ALTA', {
          key: e.key,
          ctrl: e.ctrlKey,
          shift: e.shiftKey,
          meta: e.metaKey,
        });
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [enabled, reportIncident]);

  // ----- DevTools detection (resize threshold + console getter trap) -----
  useEffect(() => {
    if (!enabled) return undefined;
    let reported = false;
    // Damos 5 segundos de gracia tras montar para evitar falsos positivos
    // del propio request-fullscreen reorganizando el viewport.
    const startedAt = Date.now();
    const detect = () => {
      if (reported || isLockedRef.current) return;
      if (Date.now() - startedAt < 5_000) return;
      const dpr = window.devicePixelRatio || 1;
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth) / dpr;
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight) / dpr;
      if (widthDiff > DEVTOOLS_THRESHOLD_PX || heightDiff > DEVTOOLS_THRESHOLD_PX) {
        reported = true;
        reportIncident('DEVTOOLS_DETECTED', 'CRITICA', {
          method: 'resize',
          widthDiff,
          heightDiff,
        });
        return;
      }
      // Console getter trap
      let trapped = false;
      const trap = {};
      try {
        Object.defineProperty(trap, 'id', {
          get() {
            trapped = true;
            return '';
          },
        });
        // eslint-disable-next-line no-console
        console.debug('%c', trap);
      } catch {
        /* ignore */
      }
      if (trapped) {
        reported = true;
        reportIncident('DEVTOOLS_DETECTED', 'CRITICA', { method: 'console_getter' });
      }
    };
    const id = setInterval(detect, DEVTOOLS_POLL_MS);
    return () => clearInterval(id);
  }, [enabled, reportIncident]);

  // ----- beforeunload guard (pregunta antes de cerrar) -----
  useEffect(() => {
    if (!enabled || isLocked) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '¿Seguro que quieres salir? Tu intento sigue en curso.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, isLocked]);

  // ----- Heartbeat -----
  useHeartbeat({
    intentoId,
    enabled: enabled && !isLocked && Boolean(fingerprint),
    fingerprintHash: fingerprint?._hash,
    csrfToken,
    onTick: (resp) => {
      if (typeof resp?.suspicion_score === 'number') setScore(resp.suspicion_score);
      if (typeof resp?.strikes_count === 'number') setStrikes(resp.strikes_count);
    },
    onForceSubmit: (reason) => {
      isLockedRef.current = true;
      setIsLocked(true);
      setLockReason(reason);
      onLockRef.current?.(reason);
      onAutoSubmitRef.current?.(reason);
    },
    onExpired: () => {
      isLockedRef.current = true;
      setIsLocked(true);
      setLockReason('expirado');
      onLockRef.current?.('expirado');
    },
    onConnectionLost: () => {
      reportIncident('HEARTBEAT_LOST', 'MEDIA', {});
    },
  });

  // ----- Auto-lock cuando strikes >= maxStrikes -----
  useEffect(() => {
    if (strikes >= maxStrikes && !isLocked) {
      isLockedRef.current = true;
      setIsLocked(true);
      setLockReason('strikes_exceeded');
      onLockRef.current?.('strikes_exceeded');
      onAutoSubmitRef.current?.('strikes_exceeded');
    }
  }, [strikes, maxStrikes, isLocked]);

  const dismissWarning = useCallback(() => {
    setShowStrikeWarning(false);
  }, []);

  return {
    // estado
    strikes,
    score,
    fullscreen,
    warnings,
    isLocked,
    lockReason,
    fingerprint,
    showStrikeWarning,
    // callbacks
    requestFullscreen,
    reportIncident,
    dismissWarning,
  };
}

export default useAntiCheat;

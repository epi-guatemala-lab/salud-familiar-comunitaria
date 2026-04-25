// src/hooks/useDebouncedCallback.js
//
// Devuelve una función estable que, al invocarse, dispara la versión
// más reciente del callback original tras `delayMs` de inactividad.
// Cancela invocaciones previas pendientes y limpia el timeout en
// unmount para evitar fugas.
//
// Uso típico: autosave de respuestas de examen con coalescing.

import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback(callback, delayMs = 500) {
  const cbRef = useRef(callback);
  const timerRef = useRef(null);

  // Mantener siempre la última versión del callback sin recrear la función debounced.
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  // Cleanup en unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        try {
          cbRef.current?.(...args);
        } catch (err) {
          // No tirar excepciones desde un timer — registrar y seguir.
          // eslint-disable-next-line no-console
          console.warn('useDebouncedCallback: callback error', err);
        }
      }, delayMs);
    },
    [delayMs]
  );

  // Permite forzar el flush manual (útil antes de submit).
  debounced.flush = (...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return cbRef.current?.(...args);
  };

  // Permite cancelar pendiente.
  debounced.cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return debounced;
}

export default useDebouncedCallback;

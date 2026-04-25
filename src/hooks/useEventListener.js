import { useEffect, useRef } from 'react';

// Adjunta listener manteniendo referencia estable del handler.
// target default = window.
export function useEventListener(eventName, handler, target = null, options) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const t = target ?? (typeof window !== 'undefined' ? window : null);
    if (!t || typeof t.addEventListener !== 'function') return;

    const listener = (event) => savedHandler.current(event);
    t.addEventListener(eventName, listener, options);
    return () => t.removeEventListener(eventName, listener, options);
  }, [eventName, target, options]);
}

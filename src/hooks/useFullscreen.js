// src/hooks/useFullscreen.js
//
// Wrapper minimalista de la Fullscreen API con soporte para WebKit
// (Safari) y prefijos legados.
//
// Devuelve:
//   - isFullscreen: boolean reactivo (se actualiza ante cualquier salida)
//   - requestFullscreen(el?): Promise<boolean> — true si se entró a FS
//   - exitFullscreen(): void
//   - isSupported: boolean (false en Safari iOS p.ej.)

import { useCallback, useEffect, useState } from 'react';

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function isFullscreenSupported() {
  const el = document.documentElement;
  return Boolean(
    el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen
  );
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(getFullscreenElement()));

  const requestFullscreen = useCallback(async (target) => {
    const el = target || document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      } else {
        return false;
      }
      // Pequeño delay para permitir que el evento fullscreenchange dispare.
      return true;
    } catch (err) {
      // El usuario denegó la solicitud o no se invocó dentro de un user-gesture.
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        return document.exitFullscreen();
      }
      if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(getFullscreenElement()));
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];
    events.forEach((ev) => document.addEventListener(ev, handler));
    return () => events.forEach((ev) => document.removeEventListener(ev, handler));
  }, []);

  return {
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
    isSupported: isFullscreenSupported(),
  };
}

export default useFullscreen;

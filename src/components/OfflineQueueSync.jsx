import { useEffect } from 'react';
import { QUEUE_KEY, flush, getCount, refresh, setOnline } from '../lib/offlineQueue';

// Componente sin UI que monta el motor de la cola offline UNA vez por pestaña
// (se coloca en App dentro de los providers). Centraliza los disparadores de
// drenaje que antes duplicaba cada useOfflineQueue con sus propios listeners:
// montaje, evento 'online', focus de la pestaña, reintento periódico y
// sincronización cross-tab vía 'storage'. El estado de conexión que expone el
// hook vive en el propio módulo y se actualiza desde aquí.
export default function OfflineQueueSync() {
  useEffect(() => {
    setOnline(navigator.onLine);

    // Drenaje condicionado: solo con red y con pendientes reales.
    const maybeFlush = () => {
      if (navigator.onLine && getCount() > 0) flush();
    };

    // Al montar: la pestaña pudo abrirse con red y envíos pendientes viejos.
    maybeFlush();

    const handleOnline = () => {
      setOnline(true);
      flush();
    };
    const handleOffline = () => setOnline(false);
    // Al volver a la pestaña: cubre red que volvió mientras estaba en background.
    const handleFocus = () => maybeFlush();
    // Otra pestaña movió la cola: solo re-notificar (los contadores se
    // sincronizan; el drenaje lo hacen esa pestaña o el intervalo).
    const handleStorage = (e) => {
      if (e.key === QUEUE_KEY) refresh();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    // Reintento periódico: recupera fallos transitorios sin evento de red.
    const timer = window.setInterval(maybeFlush, 60_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

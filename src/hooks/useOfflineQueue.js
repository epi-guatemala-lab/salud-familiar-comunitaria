import { useCallback, useEffect, useState } from 'react';
import {
  enqueue as enqueueItem,
  flush as flushQueue,
  getSnapshot,
  subscribe,
} from '../lib/offlineQueue';

// Adaptador del motor lib/offlineQueue para la UI. La lógica (persistencia,
// drenaje, rate limit, listeners de red) vive en el módulo y la dispara
// <OfflineQueueSync/> montado una sola vez en App; este hook solo refleja su
// estado, sin registrar listeners propios (evita el doble drenaje de antes).
export function useOfflineQueue() {
  const [snapshot, setSnapshot] = useState(getSnapshot);

  useEffect(() => {
    const unsubscribe = subscribe(() => setSnapshot(getSnapshot()));
    // Re-leer al montar: la cola pudo cambiar entre el primer render y aquí.
    setSnapshot(getSnapshot());
    return unsubscribe;
  }, []);

  // enqueue conserva la firma async del contrato original del hook.
  const enqueue = useCallback(async (path, body) => enqueueItem(path, body), []);
  const flush = useCallback(() => flushQueue(), []);

  const { items } = snapshot;
  return { items, count: items.length, isOnline: snapshot.isOnline, flushing: snapshot.flushing, enqueue, flush };
}

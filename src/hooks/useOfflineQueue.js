import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { STORAGE_KEYS } from '../config/constants';
import { getJSON, setJSON } from '../lib/storage';

const QUEUE_KEY = STORAGE_KEYS.OFFLINE_QUEUE;
const MAX_ITEMS = 50;
const TTL_MS = 24 * 3600 * 1000; // 24h

function loadQueue() {
  const items = getJSON(QUEUE_KEY, []);
  if (!Array.isArray(items)) return [];
  const now = Date.now();
  return items.filter((i) => i && typeof i.ts === 'number' && now - i.ts < TTL_MS);
}

function saveQueue(items) {
  setJSON(QUEUE_KEY, items.slice(0, MAX_ITEMS));
}

export function useOfflineQueue() {
  const [items, setItems] = useState(loadQueue);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [flushing, setFlushing] = useState(false);

  const flush = useCallback(async () => {
    const pending = loadQueue();
    if (pending.length === 0) {
      setItems([]);
      return { sent: 0, failed: 0 };
    }
    setFlushing(true);
    const remaining = [];
    let sent = 0;
    let failed = 0;
    for (const item of pending) {
      try {
        await api.post(item.path, item.body, { auth: false, maxRetries: 1 });
        sent += 1;
      } catch (err) {
        const status = err?.status ?? 0;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
          // Error de validacion: drop (no tiene sentido reintentar)
          failed += 1;
          continue;
        }
        // Error transitorio: dejar en cola
        remaining.push(item);
      }
    }
    setItems(remaining);
    saveQueue(remaining);
    setFlushing(false);
    return { sent, failed };
  }, []);

  useEffect(() => {
    const onlineHandler = () => {
      setIsOnline(true);
      flush();
    };
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }, [flush]);

  const enqueue = useCallback(async (path, body) => {
    const item = {
      id: Math.random().toString(36).slice(2),
      ts: Date.now(),
      path,
      body,
    };
    const newItems = [item, ...loadQueue()];
    setItems(newItems);
    saveQueue(newItems);
    return item;
  }, []);

  return { items, count: items.length, isOnline, flushing, enqueue, flush };
}

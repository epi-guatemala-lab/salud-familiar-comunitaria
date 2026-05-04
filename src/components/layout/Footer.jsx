import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { VITE_VERSION } from '../../config/env';

export default function Footer() {
  const { count, isOnline } = useOfflineQueue();
  return (
    <footer className="bg-igss-50 border-t border-igss-200 text-xs text-gray-600 py-3 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-3 justify-between items-center">
        <span>© {new Date().getFullYear()} IGSS — Salud Familiar y Comunitaria</span>
        <span className="font-mono text-gray-400">v{String(VITE_VERSION).slice(0, 7)}</span>
        {!isOnline && (
          <span className="text-yellow-700 font-semibold">⚠ Sin conexión</span>
        )}
        {count > 0 && (
          <span className="text-igss-gold-dark font-semibold">
            {count} envío{count > 1 ? 's' : ''} pendiente{count > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </footer>
  );
}

const STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  success: 'bg-green-50 border-green-300 text-green-900',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-900',
  error: 'bg-red-50 border-red-300 text-red-900',
};

const ICONS = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export default function Toast({ type = 'info', children, onClose }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 px-4 py-3 border rounded-lg shadow-md animate-slide-up ${STYLES[type] || STYLES.info}`}
    >
      <span className="font-bold" aria-hidden="true">
        {ICONS[type] || ICONS.info}
      </span>
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

import { useEffect } from 'react';

export default function Modal({
  open = true,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`bg-white rounded-lg shadow-xl w-full ${sizes[size] || sizes.md} max-h-full overflow-auto`}>
        {title && (
          <div className="border-b border-gray-200 px-5 py-3 flex justify-between items-center">
            <h3 className="font-bold text-igss-800">{title}</h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="border-t border-gray-200 px-5 py-3 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

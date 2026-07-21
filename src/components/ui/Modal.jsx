import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({
  open = true,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  ariaLabel,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const generatedTitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE))
        .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const first = dialogRef.current?.querySelector(FOCUSABLE);
      (first || dialogRef.current)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current instanceof HTMLElement) previousFocusRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  const titleId = title ? generatedTitleId : undefined;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`bg-white rounded-lg shadow-xl w-full ${sizes[size] || sizes.md} max-h-full overflow-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={title ? undefined : ariaLabel || 'Ventana modal'}
        tabIndex={-1}
      >
        {(title || onClose) && (
          <div className="border-b border-gray-200 px-5 py-3 flex justify-between items-center">
            {title
              ? <h3 id={titleId} className="font-bold text-igss-800">{title}</h3>
              : <span aria-hidden="true" />}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="min-h-11 min-w-11 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 text-xl leading-none"
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

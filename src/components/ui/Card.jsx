export default function Card({ title, children, footer, className = '', headerExtra, padded = true }) {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {(title || headerExtra) && (
        <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          {title && <h3 className="font-semibold text-igss-800">{title}</h3>}
          {headerExtra}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
      {footer && <div className="border-t border-gray-200 px-4 py-3">{footer}</div>}
    </div>
  );
}

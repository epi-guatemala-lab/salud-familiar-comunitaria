import { useState } from 'react';

/**
 * Tooltip simple basado en hover. No usa portal — se renderiza inline.
 * Props:
 *   - content: string | ReactNode (contenido del tooltip)
 *   - children: ReactNode (elemento que dispara el tooltip)
 *   - placement: 'top' | 'bottom' | 'left' | 'right' (default 'top')
 *   - className: string adicional para el wrapper
 */
export default function Tooltip({ content, children, placement = 'top', className = '' }) {
  const [show, setShow] = useState(false);

  if (!content) return children;

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
  };

  return (
    <span
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow whitespace-nowrap ${positions[placement] || positions.top}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}

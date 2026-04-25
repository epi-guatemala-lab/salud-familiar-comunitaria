import { ESCALA_LIKERT_5 } from './schema';

// Card individual de un item likert con 5 botones tactiles grandes.
// Cumple A11y: cada boton es <button> con aria-label semantico.
export default function ItemLikertCard({ id, number, text, value, onChange, error }) {
  return (
    <div
      id={id}
      className={`rounded-lg p-3 border transition ${
        error
          ? 'border-red-500 bg-red-50'
          : value
            ? 'border-igss-300 bg-igss-50'
            : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2 mb-3">
        <span className="font-bold text-igss-700 shrink-0">{number}.</span>
        <p className="text-sm text-gray-800 leading-tight">{text}</p>
      </div>
      <div className="flex justify-between gap-1" role="radiogroup" aria-labelledby={`${id}-text`}>
        {ESCALA_LIKERT_5.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${opt.value} - ${opt.label}`}
              onClick={() => onChange?.(opt.value)}
              className={`flex-1 h-12 rounded-lg font-bold text-lg transition select-none
                ${
                  selected
                    ? `${opt.color} ${opt.ring} text-white ring-4 scale-105 shadow`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              {opt.value}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

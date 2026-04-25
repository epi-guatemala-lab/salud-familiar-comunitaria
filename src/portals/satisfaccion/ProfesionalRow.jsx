import { ESCALA_PROFESIONAL } from './schema';

// Row tabular para calificar la atencion de un tipo de profesional.
// 4 niveles: 1=Debe mejorar, 2=Aceptable, 3=Buena, 4=No aplica.
export default function ProfesionalRow({ label, value, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-gray-100 last:border-b-0">
      <div className="sm:w-40 font-medium text-gray-700 text-sm">{label}</div>
      <div className="flex-1 flex flex-wrap gap-2" role="radiogroup" aria-label={`Calificacion ${label}`}>
        {ESCALA_PROFESIONAL.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label} - ${opt.label}`}
              onClick={() => onChange?.(opt.value)}
              className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition border
                ${
                  selected
                    ? `${opt.color} ${opt.textColor} border-transparent shadow`
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

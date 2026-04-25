/**
 * RubricaItemRadios — control reutilizable para escala 2/3/4 (semáforo) o 1-4 (genérica).
 *
 * Props:
 *   item: { id, nivel_1_desc?, nivel_2_desc, nivel_3_desc, nivel_4_desc, nivel_X_puntaje? }
 *   valor: número actualmente seleccionado (1..4) o null
 *   onChange: (n) => void
 *   escalaTipo: 'LIKERT_1_4' | 'SEMAFORO_2_3_4' (default semaforo)
 *   readOnly: boolean
 */
export default function RubricaItemRadios({
  item,
  valor,
  onChange,
  escalaTipo = 'SEMAFORO_2_3_4',
  readOnly = false,
}) {
  const niveles = escalaTipo === 'LIKERT_1_4' ? [1, 2, 3, 4] : [2, 3, 4];

  const colores = {
    1: 'bg-red-600',
    2: 'bg-red-500',
    3: 'bg-amber-500',
    4: 'bg-igss-600',
  };

  return (
    <div className="flex gap-3 items-center flex-wrap">
      {niveles.map((n) => {
        const desc = item?.[`nivel_${n}_desc`];
        const pts = item?.[`nivel_${n}_puntaje`];
        const selected = valor === n;
        const base =
          'w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all';
        const stateClasses = selected
          ? `${colores[n]} text-white ring-4 ring-offset-2 ring-igss-400 scale-110`
          : 'bg-gray-200 text-gray-500 hover:bg-gray-300';
        return (
          <div key={n} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => !readOnly && onChange(n)}
              disabled={readOnly}
              title={desc || `Nivel ${n}`}
              aria-label={`Nivel ${n}${desc ? `: ${desc}` : ''}`}
              aria-pressed={selected}
              className={`${base} ${stateClasses} ${
                readOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
              }`}
            >
              {n}
            </button>
            {pts != null && (
              <span className="text-[10px] text-gray-500">{pts} pts</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

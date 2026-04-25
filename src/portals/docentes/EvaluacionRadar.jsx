import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

/**
 * EvaluacionRadar — chart radar reutilizable.
 *
 * Props:
 *   data: [{ dimension, valor, comparativo? }]
 *   showComparativo: boolean
 *   max: número (default 100)
 *   height: px (default 320)
 */
export default function EvaluacionRadar({
  data = [],
  showComparativo = false,
  max = 100,
  height = 320,
}) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No hay datos disponibles para el gráfico.
      </p>
    );
  }
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#374151', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, max]}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
          />
          <Tooltip
            formatter={(v) =>
              typeof v === 'number' ? `${v.toFixed(1)}${max === 100 ? '%' : ''}` : v
            }
          />
          <Radar
            name="Residente"
            dataKey="valor"
            stroke="#2E7D32"
            fill="#2E7D32"
            fillOpacity={0.4}
          />
          {showComparativo && (
            <Radar
              name="Cohorte"
              dataKey="comparativo"
              stroke="#BFA033"
              fill="#BFA033"
              fillOpacity={0.2}
            />
          )}
          {showComparativo && <Legend />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';

import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EvaluacionRadar from '../docentes/EvaluacionRadar';
import { STORAGE_KEYS } from '../../config/constants';

const NIVEL_TONE = {
  INSUFICIENTE: { tone: 'red', label: 'Insuficiente' },
  REGULAR: { tone: 'yellow', label: 'Regular' },
  BUENO: { tone: 'blue', label: 'Bueno' },
  EXCELENTE: { tone: 'green', label: 'Excelente' },
};

function fmtFechaLarga(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * EvaluacionDetalle (estudiante) — vista read-only de una evaluación firmada.
 * Path: /estudiantes/evaluaciones/:id
 *
 * GET /api/estudiante/evaluaciones/:id →
 *   { id, docente_nombre, rubrica_codigo, tema_titulo, fecha, modalidad,
 *     porcentaje, puntaje_total, puntaje_max,
 *     dimensiones: [{ dimension, valor }],
 *     items: [{ id, codigo, descripcion, nivel, puntos, comentario }],
 *     fortalezas: [string], areas_mejora: [string] }
 */
export default function EvaluacionDetalle() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error } = useApi(`/api/estudiante/evaluaciones/${id}`, [id]);
  const [downloading, setDownloading] = useState(false);

  const ev = data || {};

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const base = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const res = await fetch(`${base}/api/estudiante/transcript.pdf?eval_id=${id}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluacion_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || 'No se pudo descargar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
        Error al cargar evaluación: {error?.message || 'No se pudo conectar al servidor'}
      </div>
    );
  }

  const pct =
    ev.porcentaje != null
      ? Number(ev.porcentaje)
      : ev.puntaje_total != null && ev.puntaje_max
      ? (Number(ev.puntaje_total) / Number(ev.puntaje_max)) * 100
      : null;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/estudiantes/calificaciones"
            className="text-xs font-medium text-igss-700 hover:text-igss-900"
          >
            ← Volver a calificaciones
          </Link>
          <h1 className="text-2xl font-bold text-igss-900 mt-2">
            Evaluación firmada #{id}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {ev.docente_nombre || 'Docente'} · {ev.rubrica_codigo || ''}
            {ev.tema_titulo ? ` · ${ev.tema_titulo}` : ''} ·{' '}
            {fmtFechaLarga(ev.fecha)}
            {ev.modalidad ? ` · ${ev.modalidad}` : ''}
          </p>
        </div>
        <Button type="button" onClick={handleDownloadPdf} loading={downloading}>
          📄 Descargar PDF
        </Button>
      </div>

      {/* Gauge + radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Puntaje obtenido
          </p>
          <Gauge pct={pct} />
          {ev.puntaje_total != null && ev.puntaje_max && (
            <p className="text-sm text-gray-600 mt-2">
              {Number(ev.puntaje_total).toFixed(1)} / {ev.puntaje_max}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Desempeño por dimensión
          </p>
          {Array.isArray(ev.dimensiones) && ev.dimensiones.length > 0 ? (
            <EvaluacionRadar
              data={ev.dimensiones.map((d) => ({
                dimension: d.dimension || d.label,
                valor: Number(d.valor || d.value || 0),
              }))}
              max={100}
              height={280}
            />
          ) : (
            <p className="text-sm text-gray-500 italic">
              No hay datos de dimensiones disponibles.
            </p>
          )}
        </Card>
      </div>

      {/* Tabla de ítems */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Ítem
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Nivel asignado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Puntos
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Comentario docente
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {(ev.items || []).map((it) => {
                const nivelCfg = NIVEL_TONE[it.nivel] || {
                  tone: 'default',
                  label: it.nivel || '—',
                };
                return (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-gray-900">
                        {it.codigo || `Ítem ${it.id}`}
                      </p>
                      <p className="text-xs text-gray-500">{it.descripcion}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge tone={nivelCfg.tone}>{nivelCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {it.puntos != null ? Number(it.puntos).toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {it.comentario ? (
                        it.comentario
                      ) : (
                        <span className="italic text-gray-400">Sin comentario</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!ev.items || ev.items.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-6 text-sm italic text-gray-500 text-center">
                    No hay ítems registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fortalezas / áreas de mejora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 bg-igss-50 border border-igss-200">
          <h3 className="text-sm font-semibold text-igss-800 mb-2">Fortalezas</h3>
          {Array.isArray(ev.fortalezas) && ev.fortalezas.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              {ev.fortalezas.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-gray-500">Sin observaciones.</p>
          )}
        </Card>

        <Card className="p-5 bg-amber-50 border border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Áreas de mejora
          </h3>
          {Array.isArray(ev.areas_mejora) && ev.areas_mejora.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
              {ev.areas_mejora.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-gray-500">Sin observaciones.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Gauge({ pct }) {
  if (pct == null || Number.isNaN(pct)) {
    return <div className="text-3xl font-bold text-gray-400">—</div>;
  }
  const valor = Math.max(0, Math.min(100, Number(pct)));
  let color = 'text-red-600';
  if (valor >= 80) color = 'text-igss-700';
  else if (valor >= 60) color = 'text-blue-600';
  else if (valor >= 40) color = 'text-amber-600';
  // SVG circular progress
  const radius = 60;
  const stroke = 12;
  const C = 2 * Math.PI * radius;
  const offset = C - (valor / 100) * C;
  return (
    <div className="relative w-44 h-44">
      <svg width="176" height="176" className="-rotate-90">
        <circle
          cx="88"
          cy="88"
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx="88"
          cy="88"
          r={radius}
          stroke="currentColor"
          className={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{valor.toFixed(0)}%</span>
      </div>
    </div>
  );
}

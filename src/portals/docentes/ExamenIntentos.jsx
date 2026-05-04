import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';

import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import SemaforoBadge from './SemaforoBadge';

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'CALIFICADO', label: 'Calificado' },
  { value: 'EXPIRADO', label: 'Expirado' },
  { value: 'ANULADO', label: 'Anulado' },
];

const SEMAFOROS = [
  { value: '', label: 'Todos' },
  { value: 'verde', label: '🟢 OK (<5)' },
  { value: 'amarillo', label: '🟡 Baja (5-10)' },
  { value: 'naranja', label: '🟠 Revisar (10-20)' },
  { value: 'rojo', label: '🔴 Alta (≥20)' },
];

function nivelDeScore(s) {
  const n = Number(s);
  if (Number.isNaN(n) || s == null) return 'na';
  if (n < 5) return 'verde';
  if (n < 10) return 'amarillo';
  if (n < 20) return 'naranja';
  return 'rojo';
}

function fmtFecha(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtDuracion(minutos) {
  if (minutos == null) return '—';
  const m = Number(minutos);
  if (Number.isNaN(m)) return '—';
  if (m < 60) return `${m.toFixed(0)} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return `${h}h ${r}m`;
}

/**
 * ExamenIntentos — tabla de intentos de un examen específico.
 * Path: /docentes/examenes/:id/intentos
 *
 * GET /api/docente/examenes/:id/intentos →
 *   { examen: {...}, intentos: [{ id, residente_nombre, fecha_inicio, duracion_min,
 *     estado, puntaje_auto, puntaje_manual, puntaje_total, porcentaje,
 *     suspicion_score, strikes }] }
 */
export default function ExamenIntentos() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useApi(
    `/api/docente/examenes/${id}/intentos`,
    [id]
  );

  const [estado, setEstado] = useState('');
  const [semaforo, setSemaforo] = useState('');

  const examen = data?.examen || data?.exam || null;
  const intentos = useMemo(() => {
    const arr =
      (data?.intentos || data?.data || (Array.isArray(data) ? data : [])) ?? [];
    return arr.filter((it) => {
      if (estado && it.estado !== estado) return false;
      if (semaforo && nivelDeScore(it.suspicion_score) !== semaforo) return false;
      return true;
    });
  }, [data, estado, semaforo]);

  const stats = useMemo(() => {
    const arr =
      (data?.intentos || data?.data || (Array.isArray(data) ? data : [])) ?? [];
    if (arr.length === 0) {
      return { total: 0, aprobPct: null, promedio: null, sospechosos: 0 };
    }
    const calificados = arr.filter((i) => i.puntaje_total != null);
    const aprobados = calificados.filter(
      (i) => Number(i.porcentaje ?? 0) >= 60
    ).length;
    const aprobPct = calificados.length
      ? (aprobados / calificados.length) * 100
      : null;
    const sumaScore = arr.reduce(
      (a, i) => a + (Number(i.suspicion_score) || 0),
      0
    );
    const promedio = arr.length ? sumaScore / arr.length : 0;
    const sospechosos = arr.filter(
      (i) => Number(i.suspicion_score || 0) >= 10
    ).length;
    return { total: arr.length, aprobPct, promedio, sospechosos };
  }, [data]);

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <Link
          to="/docentes/examenes"
          className="text-xs font-medium text-igss-700 hover:text-igss-900"
        >
          ← Volver a exámenes
        </Link>
        <h1 className="text-2xl font-bold text-igss-900 mt-2">
          {examen?.titulo || `Examen #${id}`}
        </h1>
        {examen && (
          <p className="text-sm text-gray-600">
            {examen.modalidad || ''} ·{' '}
            {examen.fecha_inicio ? fmtFecha(examen.fecha_inicio) : ''}
            {examen.fecha_fin ? ` → ${fmtFecha(examen.fecha_fin)}` : ''} ·{' '}
            Duración límite: {examen.duracion_minutos || '—'} min
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiBox label="Total intentos" value={stats.total} />
        <KpiBox
          label="% aprobados (≥60%)"
          value={stats.aprobPct == null ? '—' : `${stats.aprobPct.toFixed(0)}%`}
        />
        <KpiBox
          label="Promedio sospechosidad"
          value={stats.promedio == null ? '—' : stats.promedio.toFixed(1)}
        />
        <KpiBox
          label="Sospechosos (≥10)"
          value={stats.sospechosos}
          accent={stats.sospechosos > 0 ? 'red' : 'green'}
        />
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            {ESTADOS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Semáforo de integridad"
            value={semaforo}
            onChange={(e) => setSemaforo(e.target.value)}
          >
            {SEMAFOROS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>Error al cargar: {error?.message || 'No se pudo conectar al servidor'}</span>
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Spinner />
          </div>
        ) : intentos.length === 0 ? (
          <p className="p-8 text-sm text-gray-500 italic text-center">
            No hay intentos que cumplan los filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Residente</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Inicio</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Duración</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Auto</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Manual</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">%</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Integridad</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Strikes</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {intentos.map((it) => (
                  <tr
                    key={it.id}
                    className="hover:bg-igss-50 cursor-pointer"
                    onClick={() => {
                      window.location.href = `/docentes/intentos/${it.id}`;
                    }}
                  >
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {it.residente_nombre || `Residente #${it.residente_id}`}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {fmtFecha(it.fecha_inicio)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {fmtDuracion(it.duracion_min)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <EstadoIntentoBadge estado={it.estado} />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {it.puntaje_auto ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {it.puntaje_manual ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {it.puntaje_total ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-sm whitespace-nowrap">
                      {it.porcentaje != null ? `${Number(it.porcentaje).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <SemaforoBadge score={it.suspicion_score} />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {it.strikes ?? 0}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/docentes/intentos/${it.id}`}
                        className="text-xs font-medium text-igss-700 hover:text-igss-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiBox({ label, value, accent }) {
  const accentClass =
    accent === 'red'
      ? 'border-l-red-500'
      : accent === 'green'
      ? 'border-l-igss-600'
      : 'border-l-blue-500';
  return (
    <Card className={`p-3 border-l-4 ${accentClass}`}>
      <div className="text-2xl font-bold text-igss-900">{value}</div>
      <div className="text-xs text-gray-600 uppercase tracking-wide">{label}</div>
    </Card>
  );
}

function EstadoIntentoBadge({ estado }) {
  const map = {
    EN_CURSO: { tone: 'yellow', label: 'En curso' },
    ENVIADO: { tone: 'blue', label: 'Enviado' },
    CALIFICADO: { tone: 'green', label: 'Calificado' },
    EXPIRADO: { tone: 'default', label: 'Expirado' },
    ANULADO: { tone: 'red', label: 'Anulado' },
  };
  const cfg = map[estado] || { tone: 'default', label: estado || '—' };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

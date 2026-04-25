import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function isoYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(s) {
  if (!s) return null;
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function rangoDias(inicio, fin) {
  if (!inicio || !fin) return [];
  const a = parseYmd(inicio);
  const b = parseYmd(fin);
  if (!a || !b) return [];
  const out = [];
  const cur = new Date(a);
  while (cur <= b) {
    out.push(isoYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Calendario (estudiante) — vista mensual con badges por día.
 *
 * GET /api/estudiante/calendario?anio=2026&mes=4 →
 *   { rotaciones: [{ id, nombre, fecha_inicio, fecha_fin }],
 *     evaluaciones: [{ id, fecha, docente_nombre, rubrica_codigo }],
 *     examenes: [{ id, titulo, fecha_inicio, fecha_fin }] }
 *
 * Si el endpoint no existe aún, usa /api/estudiante/dashboard como fallback.
 */
export default function Calendario() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  // TODO: backend endpoint /api/estudiante/calendario (con anio/mes querystring)
  const path = `/api/estudiante/calendario?anio=${year}&mes=${month + 1}`;
  const { data, loading, error } = useApi(path, [year, month]);

  // Set de fechas con eventos por categoría.
  const { rotacionesMap, evaluacionesMap, examenesMap, eventosPorDia } = useMemo(() => {
    const r = data?.rotaciones || [];
    const e = data?.evaluaciones || [];
    const x = data?.examenes || [];
    const rotacionesMap = new Map();
    r.forEach((rot) => {
      rangoDias(rot.fecha_inicio, rot.fecha_fin).forEach((d) =>
        rotacionesMap.set(d, [...(rotacionesMap.get(d) || []), rot])
      );
    });
    const evaluacionesMap = new Map();
    e.forEach((ev) => {
      const key = (ev.fecha || '').slice(0, 10);
      if (key) {
        evaluacionesMap.set(key, [...(evaluacionesMap.get(key) || []), ev]);
      }
    });
    const examenesMap = new Map();
    x.forEach((ex) => {
      rangoDias(ex.fecha_inicio, ex.fecha_fin).forEach((d) =>
        examenesMap.set(d, [...(examenesMap.get(d) || []), ex])
      );
    });
    const eventosPorDia = new Map();
    [rotacionesMap, evaluacionesMap, examenesMap].forEach((m, idx) => {
      const tipo = ['rotacion', 'evaluacion', 'examen'][idx];
      m.forEach((items, day) => {
        eventosPorDia.set(day, [
          ...(eventosPorDia.get(day) || []),
          ...items.map((it) => ({ ...it, _tipo: tipo })),
        ]);
      });
    });
    return { rotacionesMap, evaluacionesMap, examenesMap, eventosPorDia };
  }, [data]);

  // Generar grid del mes (siempre 6 semanas para layout estable)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = first.getDay(); // 0=domingo
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(year, month, 1 - startOffset + i);
      cells.push({
        date,
        ymd: isoYmd(date),
        inMonth: date.getMonth() === month,
      });
    }
    return cells;
  }, [year, month]);

  const [selectedDay, setSelectedDay] = useState(null);

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-igss-900">Calendario</h1>
          <p className="text-sm text-gray-600 mt-1">
            Rotaciones, evaluaciones y exámenes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm"
            aria-label="Mes anterior"
          >
            ← Anterior
          </button>
          <span className="text-base font-semibold text-igss-900 w-44 text-center">
            {MESES[month]} {year}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm"
            aria-label="Mes siguiente"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <Card className="p-2 sm:p-4">
        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-3 px-2 mb-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-igss-500" /> Rotación
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-500" /> Evaluación
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-amber-400" /> Examen activo
          </span>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 mb-3">
            Error al cargar calendario: {error.message}
          </div>
        )}

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEM.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-gray-600 uppercase py-1"
              >
                {d}
              </div>
            ))}
            {cells.map((c) => {
              const eventos = eventosPorDia.get(c.ymd) || [];
              const hasRot = rotacionesMap.has(c.ymd);
              const hasEval = evaluacionesMap.has(c.ymd);
              const hasEx = examenesMap.has(c.ymd);
              const isToday = c.ymd === isoYmd(today);
              const isSelected = selectedDay === c.ymd;
              return (
                <button
                  key={c.ymd + (c.inMonth ? '' : '-out')}
                  type="button"
                  onClick={() => eventos.length && setSelectedDay(isSelected ? null : c.ymd)}
                  className={`relative min-h-[64px] sm:min-h-[80px] p-1 rounded text-left text-xs border transition ${
                    c.inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                  } ${
                    isSelected
                      ? 'ring-2 ring-igss-500 border-igss-400'
                      : 'border-gray-200 hover:border-igss-300'
                  } ${eventos.length ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span
                    className={`absolute top-1 right-1 text-xs ${
                      isToday
                        ? 'bg-igss-700 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold'
                        : 'font-medium'
                    }`}
                  >
                    {c.date.getDate()}
                  </span>
                  <div className="flex gap-0.5 mt-5 flex-wrap">
                    {hasRot && (
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-igss-500"
                        title="Rotación"
                      />
                    )}
                    {hasEval && (
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-blue-500"
                        title="Evaluación"
                      />
                    )}
                    {hasEx && (
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-amber-400"
                        title="Examen"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selectedDay && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-igss-900 mb-2">
            Eventos del {selectedDay}
          </h3>
          <ul className="space-y-1.5">
            {(eventosPorDia.get(selectedDay) || []).map((ev, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <TipoChip tipo={ev._tipo} />
                  <span className="truncate">
                    {ev._tipo === 'rotacion' && (ev.nombre || ev.titulo || 'Rotación')}
                    {ev._tipo === 'evaluacion' && (
                      <>
                        {ev.docente_nombre || 'Docente'} · {ev.rubrica_codigo || ''}
                      </>
                    )}
                    {ev._tipo === 'examen' && (ev.titulo || `Examen #${ev.id}`)}
                  </span>
                </div>
                {ev._tipo === 'evaluacion' && ev.id && (
                  <Link
                    to={`/estudiantes/evaluaciones/${ev.id}`}
                    className="text-xs font-medium text-igss-700 hover:text-igss-900 whitespace-nowrap"
                  >
                    Ver →
                  </Link>
                )}
                {ev._tipo === 'examen' && ev.id && (
                  <Link
                    to={`/estudiantes/examenes/${ev.id}`}
                    className="text-xs font-medium text-igss-700 hover:text-igss-900 whitespace-nowrap"
                  >
                    Abrir →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TipoChip({ tipo }) {
  const cfg = {
    rotacion: { color: 'bg-igss-100 text-igss-800', label: 'Rotación' },
    evaluacion: { color: 'bg-blue-100 text-blue-800', label: 'Evaluación' },
    examen: { color: 'bg-amber-100 text-amber-800', label: 'Examen' },
  }[tipo] || { color: 'bg-gray-100 text-gray-700', label: tipo };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

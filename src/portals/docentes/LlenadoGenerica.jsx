import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import RubricaItemRadios from './RubricaItemRadios';

/**
 * LlenadoGenerica — escala 1-4 ponderada por dimensión.
 * Cards expandibles, autosave debounce, sticky footer con cálculo proyectado.
 *
 * Estructura de evaluacion (data del backend):
 * {
 *   id, estado, residente: {nombre_completo}, fecha_evaluacion, modalidad,
 *   rubrica: {
 *     codigo: 'GENERICA', version, escala_tipo: 'LIKERT_1_4',
 *     dimensiones: [{
 *       id, numero, titulo, peso_porcentaje,
 *       items: [{id, texto, nivel_1_desc, nivel_2_desc, nivel_3_desc, nivel_4_desc}]
 *     }]
 *   },
 *   items: { [item_id]: nivel },     // respuestas previas
 *   observaciones, fortalezas, areas_mejora
 * }
 */
export default function LlenadoGenerica({ evaluacion, onRefetch }) {
  const navigate = useNavigate();
  const isReadOnly = evaluacion.estado !== 'DRAFT';

  // Estado local de respuestas
  const [respuestas, setRespuestas] = useState(() => evaluacion.items || {});
  const [observaciones, setObservaciones] = useState(evaluacion.observaciones || '');
  const [fortalezas, setFortalezas] = useState(evaluacion.fortalezas || '');
  const [areasMejora, setAreasMejora] = useState(evaluacion.areas_mejora || '');
  const [expandedDim, setExpandedDim] = useState(() => {
    const dims = evaluacion.rubrica?.dimensiones || [];
    return new Set(dims.length > 0 ? [dims[0].id] : []);
  });
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [showFirmar, setShowFirmar] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [firmaError, setFirmaError] = useState(null);
  const skipSaveOnceRef = useRef(true);

  const dimensiones = evaluacion.rubrica?.dimensiones || [];

  // Debounce de las respuestas para autosave
  const debouncedRespuestas = useDebounce(respuestas, 1000);
  const debouncedObs = useDebounce(observaciones, 1000);
  const debouncedFortalezas = useDebounce(fortalezas, 1000);
  const debouncedAreas = useDebounce(areasMejora, 1000);

  useEffect(() => {
    if (isReadOnly) return;
    if (skipSaveOnceRef.current) {
      skipSaveOnceRef.current = false;
      return;
    }
    autosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRespuestas, debouncedObs, debouncedFortalezas, debouncedAreas]);

  const autosave = async () => {
    setSaveStatus('saving');
    try {
      await api.put(`/api/docente/evaluaciones/${evaluacion.id}`, {
        items: respuestas,
        observaciones,
        fortalezas,
        areas_mejora: areasMejora,
      });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const setItem = (itemId, valor) => {
    setRespuestas((prev) => ({ ...prev, [itemId]: valor }));
  };

  // Cálculo en tiempo real
  const calculo = useMemo(() => {
    let totalPonderado = 0;
    let pesoLleno = 0;
    let itemsRequeridos = 0;
    let itemsLlenos = 0;
    const dimDetalles = [];

    for (const dim of dimensiones) {
      const items = dim.items || [];
      itemsRequeridos += items.length;
      let sum = 0;
      let count = 0;
      for (const it of items) {
        const v = respuestas[it.id];
        if (v != null) {
          sum += Number(v);
          count += 1;
          itemsLlenos += 1;
        }
      }
      const promedio = count > 0 ? sum / count : null;
      const pesoNum = Number(dim.peso_porcentaje) || 0;
      const aporte =
        promedio != null ? (promedio / 4) * pesoNum : null;
      if (aporte != null) {
        totalPonderado += aporte;
        pesoLleno += pesoNum * (count / Math.max(items.length, 1));
      }
      dimDetalles.push({
        ...dim,
        promedio,
        aporte,
        completo: count === items.length && items.length > 0,
        count,
        total: items.length,
      });
    }

    const proyectado = totalPonderado;
    let nivel = '—';
    if (proyectado >= 85) nivel = 'Excelente';
    else if (proyectado >= 70) nivel = 'Adecuado';
    else if (proyectado >= 55) nivel = 'Necesita mejorar';
    else if (proyectado > 0) nivel = 'Insuficiente';

    return {
      totalPonderado: proyectado,
      itemsRequeridos,
      itemsLlenos,
      faltantes: itemsRequeridos - itemsLlenos,
      dimDetalles,
      nivel,
      progresoPct:
        itemsRequeridos > 0 ? (itemsLlenos / itemsRequeridos) * 100 : 0,
    };
  }, [dimensiones, respuestas]);

  const toggleDim = (dimId) => {
    setExpandedDim((prev) => {
      const next = new Set(prev);
      if (next.has(dimId)) next.delete(dimId);
      else next.add(dimId);
      return next;
    });
  };

  const tryFirmar = () => {
    if (calculo.faltantes > 0) {
      const primeraIncompleta = calculo.dimDetalles.find((d) => !d.completo);
      if (primeraIncompleta) {
        setExpandedDim((prev) => new Set(prev).add(primeraIncompleta.id));
        setTimeout(() => {
          const el = document.getElementById(`dim-${primeraIncompleta.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return;
    }
    setShowFirmar(true);
  };

  const handleFirmar = async () => {
    setFirmando(true);
    setFirmaError(null);
    try {
      // Asegurar guardado antes de firmar
      await api.put(`/api/docente/evaluaciones/${evaluacion.id}`, {
        items: respuestas,
        observaciones,
        fortalezas,
        areas_mejora: areasMejora,
      });
      const res = await api.post(
        `/api/docente/evaluaciones/${evaluacion.id}/firmar`,
        {},
      );
      const residenteId =
        res?.residente_id ||
        res?.residente?.id ||
        evaluacion.residente?.id;
      navigate(
        residenteId
          ? `/docentes/residentes/${residenteId}`
          : '/docentes/evaluaciones',
      );
    } catch (err) {
      setFirmaError(err?.message || 'No se pudo firmar la evaluación');
      setFirmando(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl pb-32">
      <div>
        <Link
          to={`/docentes/residentes/${evaluacion.residente?.id || ''}`}
          className="text-sm text-igss-700 hover:text-igss-900"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-igss-900 mt-1">
          Evaluación Genérica · {evaluacion.residente?.nombre_completo}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Fecha: {evaluacion.fecha_evaluacion} · Modalidad: {evaluacion.modalidad} ·
          Versión rúbrica: {evaluacion.rubrica?.version || '?'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-5">
        {/* Lado izquierdo: dimensiones */}
        <div className="space-y-3">
          {dimensiones.map((dim, idx) => {
            const detalle = calculo.dimDetalles.find((d) => d.id === dim.id);
            const expanded = expandedDim.has(dim.id);
            return (
              <Card key={dim.id} id={`dim-${dim.id}`} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleDim(dim.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-igss-700">{expanded ? '▼' : '▶'}</span>
                    <span className="font-semibold text-gray-900">
                      {idx + 1}. {dim.titulo}
                    </span>
                    <span className="text-xs text-gray-500">
                      (peso {dim.peso_porcentaje}%)
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {detalle.count}/{detalle.total} ítems ·{' '}
                    {detalle.promedio != null
                      ? `prom ${detalle.promedio.toFixed(2)}`
                      : 'sin datos'}
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100">
                    {(dim.items || []).map((item) => (
                      <div key={item.id} className="">
                        <p className="text-sm font-medium text-gray-800 mb-2">
                          {item.texto}
                        </p>
                        <RubricaItemRadios
                          item={item}
                          valor={respuestas[item.id] ?? null}
                          onChange={(n) => setItem(item.id, n)}
                          escalaTipo="LIKERT_1_4"
                          readOnly={isReadOnly}
                        />
                      </div>
                    ))}
                    {detalle.promedio != null && (
                      <div className="text-xs text-gray-600 pt-2 border-t border-gray-100">
                        Promedio dimensión:{' '}
                        <strong>{detalle.promedio.toFixed(2)}</strong> · Aporte
                        ponderado:{' '}
                        <strong>{detalle.aporte?.toFixed(2)} / {dim.peso_porcentaje}</strong>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Comentarios generales
            </h3>
            <Textarea
              label="Observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
            <Textarea
              label="Fortalezas"
              value={fortalezas}
              onChange={(e) => setFortalezas(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
            <Textarea
              label="Áreas de mejora"
              value={areasMejora}
              onChange={(e) => setAreasMejora(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
          </Card>
        </div>

        {/* Sticky panel derecho: progreso */}
        <aside className="lg:sticky lg:top-4 lg:self-start space-y-3">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Progreso</h3>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
              <div
                className="h-full bg-igss-600 transition-all"
                style={{ width: `${calculo.progresoPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mb-3">
              {calculo.progresoPct.toFixed(0)}% · {calculo.itemsLlenos} /{' '}
              {calculo.itemsRequeridos} ítems
            </div>

            <div className="text-2xl font-bold text-igss-900">
              {calculo.totalPonderado.toFixed(1)} / 100
            </div>
            <div className="text-xs text-gray-600 mb-3">{calculo.nivel}</div>

            <div className="border-t border-gray-100 pt-3 space-y-1">
              {calculo.dimDetalles.map((d, i) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-700 truncate mr-2">
                    {d.completo ? '✓' : '⏵'} {i + 1}. {d.titulo}
                  </span>
                  <span className="text-gray-900 font-medium whitespace-nowrap">
                    {d.promedio != null ? d.promedio.toFixed(1) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={autosave}
              disabled={isReadOnly || saveStatus === 'saving'}
            >
              {saveStatus === 'saving'
                ? 'Guardando...'
                : '💾 Guardar progreso'}
            </Button>
            <Button
              type="button"
              fullWidth
              onClick={tryFirmar}
              disabled={isReadOnly}
            >
              ⏎ Firmar y enviar
            </Button>
            {calculo.faltantes > 0 && (
              <p className="text-xs text-amber-700">
                ⚠ Faltan {calculo.faltantes} ítems por evaluar
              </p>
            )}
            {saveStatus === 'saved' && (
              <p className="text-xs text-igss-700">✓ Guardado automáticamente</p>
            )}
            {saveStatus === 'error' && (
              <p className="text-xs text-red-600">
                ⚠ Error al guardar — reintentando
              </p>
            )}
          </Card>
        </aside>
      </div>

      <Modal
        open={showFirmar}
        onClose={() => !firmando && setShowFirmar(false)}
        title="Confirmar firma"
      >
        <div className="space-y-3 text-sm">
          <p>Está a punto de firmar la evaluación:</p>
          <ul className="ml-4 list-disc text-gray-700">
            <li>
              Residente:{' '}
              <strong>{evaluacion.residente?.nombre_completo}</strong>
            </li>
            <li>
              Rúbrica: <strong>Genérica</strong>
            </li>
            <li>
              Puntaje proyectado:{' '}
              <strong>{calculo.totalPonderado.toFixed(1)} / 100</strong> ·{' '}
              {calculo.nivel}
            </li>
          </ul>
          <p className="text-amber-700 text-xs">
            Una vez firmada no podrá editarse. El residente la verá inmediatamente.
          </p>
          {firmaError && (
            <p className="text-red-700 text-xs">{firmaError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowFirmar(false)}
              disabled={firmando}
            >
              Cancelar
            </Button>
            <Button onClick={handleFirmar} disabled={firmando}>
              {firmando ? 'Firmando...' : 'Confirmar firma'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

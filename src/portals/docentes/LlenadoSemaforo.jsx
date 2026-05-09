import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import RubricaItemRadios from './RubricaItemRadios';

/**
 * LlenadoSemaforo — componente compartido para GYO y Pediatría.
 * Split-view: panel izquierdo sticky con caso clínico + indicaciones;
 * panel derecho con dimensiones (accordion) e ítems con escala 2/3/4.
 *
 * Props:
 *   evaluacion: objeto del backend con .rubrica.codigo (GYO|PEDIATRIA), .tema (con caso_clinico, indicaciones, dimensiones[])
 *   tipoLabel: 'GYO' | 'Pediatría'
 *   onRefetch: () => void
 */
export default function LlenadoSemaforo({ evaluacion, tipoLabel, onRefetch }) {
  const navigate = useNavigate();
  const isReadOnly = evaluacion.estado !== 'DRAFT';

  const tema = evaluacion.tema || evaluacion.rubrica?.tema || {};
  const dimensiones = tema.dimensiones || [];

  const [respuestas, setRespuestas] = useState(() => evaluacion.items || {});
  const [comentariosItem, setComentariosItem] = useState(
    () => evaluacion.comentarios_items || {},
  );
  const [observaciones, setObservaciones] = useState(evaluacion.observaciones || '');
  const [fortalezas, setFortalezas] = useState(evaluacion.fortalezas || '');
  const [areasMejora, setAreasMejora] = useState(evaluacion.areas_mejora || '');
  const [expandedDim, setExpandedDim] = useState(() => {
    return new Set(dimensiones.length > 0 ? [dimensiones[0].id] : []);
  });

  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError] = useState(null);
  const [showFirmar, setShowFirmar] = useState(false);
  const [confirmaTexto, setConfirmaTexto] = useState('');
  const [firmando, setFirmando] = useState(false);
  const [firmaError, setFirmaError] = useState(null);
  const skipSaveOnceRef = useRef(true);

  const debouncedRespuestas = useDebounce(respuestas, 1000);
  const debouncedComentarios = useDebounce(comentariosItem, 1500);
  const debouncedObs = useDebounce(observaciones, 1500);
  const debouncedFort = useDebounce(fortalezas, 1500);
  const debouncedAreas = useDebounce(areasMejora, 1500);

  useEffect(() => {
    if (isReadOnly) return;
    if (skipSaveOnceRef.current) {
      skipSaveOnceRef.current = false;
      return;
    }
    autosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedRespuestas,
    debouncedComentarios,
    debouncedObs,
    debouncedFort,
    debouncedAreas,
  ]);

  const autosave = async () => {
    setSaveStatus('saving');
    try {
      await api.put(`/api/docente/evaluaciones/${evaluacion.id}`, {
        items: respuestas,
        comentarios_items: comentariosItem,
        observaciones,
        fortalezas,
        areas_mejora: areasMejora,
      });
      setSaveStatus('saved');
      setSaveError(null);
    } catch (err) {
      // Distinguimos forbidden / unauth / red — antes era genérico
      // "Error al guardar — reintentando" infinito.
      if (err?.status === 403) {
        setSaveStatus('forbidden');
        setSaveError('No tienes permiso para editar esta evaluación (no eres el docente asignado).');
        return;
      }
      if (err?.status === 401) {
        setSaveStatus('unauth');
        setSaveError('Tu sesión expiró. Vuelve a iniciar sesión para guardar.');
        return;
      }
      setSaveStatus('error');
      setSaveError(err?.message || 'No se pudo guardar; la app reintenta automáticamente.');
    }
  };

  const setItem = (itemId, valor) => {
    setRespuestas((prev) => ({ ...prev, [itemId]: valor }));
  };
  const setComentario = (itemId, txt) => {
    setComentariosItem((prev) => ({ ...prev, [itemId]: txt }));
  };

  // Cálculo subtotales / total
  const calculo = useMemo(() => {
    let totalPuntos = 0;
    let maxPuntos = 0;
    let itemsRequeridos = 0;
    let itemsLlenos = 0;
    const dimDetalles = [];

    for (const dim of dimensiones) {
      const items = dim.items || [];
      itemsRequeridos += items.length;
      let subtotal = 0;
      let submax = 0;
      let count = 0;
      for (const it of items) {
        const puntajeMaxItem = Math.max(
          Number(it.nivel_2_puntaje) || 0,
          Number(it.nivel_3_puntaje) || 0,
          Number(it.nivel_4_puntaje) || 0,
          1,
        );
        submax += puntajeMaxItem;
        const v = respuestas[it.id];
        if (v != null) {
          itemsLlenos += 1;
          count += 1;
          const pts = Number(it[`nivel_${v}_puntaje`]) || 0;
          subtotal += pts;
        }
      }
      totalPuntos += subtotal;
      maxPuntos += submax;
      dimDetalles.push({
        ...dim,
        subtotal,
        submax,
        count,
        total: items.length,
        completo: count === items.length && items.length > 0,
        pct: submax > 0 ? (subtotal / submax) * 100 : 0,
      });
    }

    const pct = maxPuntos > 0 ? (totalPuntos / maxPuntos) * 100 : 0;
    let nivel = '—';
    let nivelColor = 'gray';
    // Umbrales del backend (services/evaluacion_calc.py:_level_threshold).
    // Antes el frontend usaba 85/70 sin "Excelente" → mismatch con BD
    // que sí persiste EXCELENTE >=90.
    if (pct >= 90) {
      nivel = '🟢 Excelente';
      nivelColor = 'verde';
    } else if (pct >= 75) {
      nivel = '🟢 Adecuado';
      nivelColor = 'verde';
    } else if (pct >= 60) {
      nivel = '🟡 Necesita mejorar';
      nivelColor = 'amarillo';
    } else if (pct > 0) {
      nivel = '🔴 Insuficiente';
      nivelColor = 'rojo';
    }

    return {
      totalPuntos,
      maxPuntos,
      pct,
      nivel,
      nivelColor,
      itemsRequeridos,
      itemsLlenos,
      faltantes: itemsRequeridos - itemsLlenos,
      progresoPct:
        itemsRequeridos > 0 ? (itemsLlenos / itemsRequeridos) * 100 : 0,
      dimDetalles,
    };
  }, [dimensiones, respuestas]);

  const toggleDim = (id) =>
    setExpandedDim((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tryFirmar = () => {
    if (calculo.faltantes > 0) {
      const primera = calculo.dimDetalles.find((d) => !d.completo);
      if (primera) {
        setExpandedDim((prev) => new Set(prev).add(primera.id));
        setTimeout(() => {
          const el = document.getElementById(`sem-dim-${primera.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return;
    }
    setShowFirmar(true);
  };

  const handleFirmar = async () => {
    if (confirmaTexto.trim().toUpperCase() !== 'FIRMAR') return;
    setFirmando(true);
    setFirmaError(null);
    try {
      await api.put(`/api/docente/evaluaciones/${evaluacion.id}`, {
        items: respuestas,
        comentarios_items: comentariosItem,
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
          : '/docentes/residentes',
      );
    } catch (err) {
      setFirmaError(err?.message || 'No se pudo firmar la evaluación');
      setFirmando(false);
    }
  };

  return (
    <div className="space-y-5 pb-32">
      <div>
        <Link
          to={`/docentes/residentes/${evaluacion.residente?.id || ''}`}
          className="text-sm text-igss-700 hover:text-igss-900"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-igss-900 mt-1">
          {tipoLabel} · {tema?.numero ? `Tema ${tema.numero}: ` : ''}
          {tema?.titulo || 'Sin tema'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Residente: <strong>{evaluacion.residente?.nombre_completo}</strong> ·
          Fecha: {evaluacion.fecha_evaluacion} · Modalidad:{' '}
          {evaluacion.modalidad} · v{evaluacion.rubrica?.version || '?'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel izq: caso clínico (sticky) */}
        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <Card className="p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                📋 Caso clínico
              </h2>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {tema?.caso_clinico || 'Sin caso clínico definido para este tema.'}
              </div>
            </div>
            {tema?.indicaciones && (
              <div className="border-t border-gray-100 pt-3">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">
                  📝 Indicaciones
                </h2>
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {tema.indicaciones}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Panel der: dimensiones */}
        <div className="space-y-3">
          {dimensiones.map((dim, idx) => {
            const detalle = calculo.dimDetalles.find((d) => d.id === dim.id);
            const expanded = expandedDim.has(dim.id);
            return (
              <Card
                key={dim.id}
                id={`sem-dim-${dim.id}`}
                className="overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleDim(dim.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-igss-700">{expanded ? '▼' : '▶'}</span>
                    <span className="font-semibold text-gray-900 truncate">
                      Dim {idx + 1}: {dim.titulo}
                    </span>
                  </div>
                  <span className="text-xs text-gray-700 whitespace-nowrap">
                    {detalle.subtotal}/{detalle.submax} pts ·{' '}
                    {detalle.count}/{detalle.total} ítems
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pt-2 space-y-5 border-t border-gray-100">
                    {(dim.items || []).map((item) => (
                      <div key={item.id} className="">
                        <p className="text-sm font-medium text-gray-800 mb-2">
                          {item.texto}
                        </p>
                        <RubricaItemRadios
                          item={item}
                          valor={respuestas[item.id] ?? null}
                          onChange={(n) => setItem(item.id, n)}
                          escalaTipo="SEMAFORO_2_3_4"
                          readOnly={isReadOnly}
                        />
                        <Textarea
                          label="Comentario (opcional)"
                          value={comentariosItem[item.id] || ''}
                          onChange={(e) =>
                            setComentario(item.id, e.target.value)
                          }
                          rows={2}
                          disabled={isReadOnly}
                          className="mt-2"
                        />
                      </div>
                    ))}
                    <div className="text-xs text-gray-700 pt-2 border-t border-gray-100">
                      Subtotal:{' '}
                      <strong>
                        {detalle.subtotal} / {detalle.submax}
                      </strong>{' '}
                      ({detalle.pct.toFixed(0)}%)
                    </div>
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
      </div>

      {/* Sticky footer con totales y acciones */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <div>
              Progreso:{' '}
              <strong>
                {calculo.itemsLlenos}/{calculo.itemsRequeridos}
              </strong>{' '}
              ({calculo.progresoPct.toFixed(0)}%)
            </div>
            <div>
              Total:{' '}
              <strong>
                {calculo.totalPuntos} / {calculo.maxPuntos}
              </strong>{' '}
              ({calculo.pct.toFixed(0)}%)
            </div>
            <div>{calculo.nivel}</div>
            {saveStatus === 'saved' && (
              <span className="text-xs text-igss-700">💾 Guardado</span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-xs text-gray-600">⏳ Guardando…</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-600">
                ⚠ {saveError || 'Error guardando; la app reintenta.'}
              </span>
            )}
            {saveStatus === 'forbidden' && (
              <span className="text-xs text-red-700 font-semibold">
                🚫 {saveError}
              </span>
            )}
            {saveStatus === 'unauth' && (
              <span className="text-xs text-red-700 font-semibold">
                🔒 {saveError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={autosave}
              disabled={isReadOnly || saveStatus === 'saving'}
            >
              💾 Guardar
            </Button>
            <Button onClick={tryFirmar} disabled={isReadOnly}>
              ⏎ Firmar
            </Button>
          </div>
        </div>
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
              Rúbrica:{' '}
              <strong>
                {tipoLabel} {tema?.titulo ? `· ${tema.titulo}` : ''}
              </strong>
            </li>
            <li>
              Puntaje:{' '}
              <strong>
                {calculo.totalPuntos} / {calculo.maxPuntos}
              </strong>{' '}
              ({calculo.pct.toFixed(0)}%) · {calculo.nivel}
            </li>
          </ul>
          <p className="text-amber-700 text-xs">
            Una vez firmada no podrá editarse y el residente la verá en su
            portal.
          </p>
          <Input
            label='Para firmar, escriba "FIRMAR":'
            value={confirmaTexto}
            onChange={(e) => setConfirmaTexto(e.target.value)}
            placeholder="FIRMAR"
            autoFocus
          />
          {firmaError && <p className="text-red-700 text-xs">{firmaError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowFirmar(false)}
              disabled={firmando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFirmar}
              disabled={
                firmando || confirmaTexto.trim().toUpperCase() !== 'FIRMAR'
              }
            >
              {firmando ? 'Firmando...' : '✅ Confirmar firma'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Textarea from '../../components/ui/Textarea';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

/**
 * RespuestasAbiertas — cola de respuestas abiertas pendientes de calificación.
 *
 * GET /api/docente/respuestas-abiertas-pendientes →
 *   { intentos: [{
 *       intento_id, residente_nombre, examen_id, examen_titulo,
 *       respuestas_pendientes: [{ id, pregunta_enunciado, puntaje_max, respuesta_texto }]
 *   }] }
 *
 * POST /api/docente/intentos/:intento_id/calificar
 *   { items: [{ respuesta_id, puntaje, comentario }] }
 */
export default function RespuestasAbiertas() {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi(
    '/api/docente/respuestas-abiertas-pendientes'
  );

  // Estado local de calificaciones por respuesta_id.
  // Forma: { [respuesta_id]: { puntaje, comentario, calificada } }
  const [grades, setGrades] = useState({});

  const intentos = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.intentos || data.data || [];
  }, [data]);

  const totales = useMemo(() => {
    let total = 0;
    let calif = 0;
    intentos.forEach((it) => {
      (it.respuestas_pendientes || []).forEach((r) => {
        total += 1;
        if (grades[r.id]?.calificada) calif += 1;
      });
    });
    return { total, calif };
  }, [intentos, grades]);

  const updateGrade = (respId, field, value) => {
    setGrades((prev) => ({
      ...prev,
      [respId]: { ...(prev[respId] || {}), [field]: value },
    }));
  };

  const calificarItem = async (intentoId, resp) => {
    const g = grades[resp.id] || {};
    const p = Number(g.puntaje);
    if (Number.isNaN(p) || p < 0 || p > Number(resp.puntaje_max || 100)) {
      toast.warning(`Puntaje inválido (0 – ${resp.puntaje_max ?? 100})`);
      return;
    }
    try {
      await api.post(`/api/docente/intentos/${intentoId}/calificar`, {
        items: [
          {
            respuesta_id: resp.id,
            puntaje: p,
            comentario: g.comentario || '',
          },
        ],
      });
      setGrades((prev) => ({
        ...prev,
        [resp.id]: { ...(prev[resp.id] || {}), calificada: true },
      }));
      toast.success('Calificación guardada');
    } catch (err) {
      toast.error(err.message || 'Error al calificar');
    }
  };

  const calificarLote = async (intento) => {
    const items = (intento.respuestas_pendientes || [])
      .filter((r) => grades[r.id] && !grades[r.id].calificada)
      .filter((r) => grades[r.id].puntaje !== '' && grades[r.id].puntaje != null)
      .map((r) => ({
        respuesta_id: r.id,
        puntaje: Number(grades[r.id].puntaje),
        comentario: grades[r.id].comentario || '',
      }));
    if (items.length === 0) {
      toast.warning('No hay calificaciones nuevas para enviar');
      return;
    }
    try {
      await api.post(`/api/docente/intentos/${intento.intento_id}/calificar`, {
        items,
      });
      setGrades((prev) => {
        const next = { ...prev };
        items.forEach((it) => {
          next[it.respuesta_id] = { ...(next[it.respuesta_id] || {}), calificada: true };
        });
        return next;
      });
      toast.success(`Se calificaron ${items.length} respuesta(s)`);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Error al calificar lote');
    }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-igss-900">Respuestas abiertas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Calificación manual de preguntas tipo abierta
          </p>
        </div>
        <div className="text-sm text-gray-700">
          Calificadas{' '}
          <span className="font-semibold text-igss-800">{totales.calif}</span> /{' '}
          {totales.total}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>Error al cargar: {error?.message || 'No se pudo conectar al servidor'}</span>
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <Card className="p-12 flex items-center justify-center">
          <Spinner />
        </Card>
      ) : intentos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-500 italic">
          ¡Sin pendientes! No hay respuestas abiertas por calificar.
        </Card>
      ) : (
        <div className="space-y-3">
          {intentos.map((intento) => (
            <Card key={intento.intento_id} className="p-0">
              <details className="group">
                <summary className="flex items-center justify-between gap-3 cursor-pointer p-4 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-igss-900 truncate">
                      {intento.residente_nombre || 'Residente'} ·{' '}
                      {intento.examen_titulo || `Examen #${intento.examen_id}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(intento.respuestas_pendientes || []).length} respuesta(s) pendiente(s)
                    </p>
                  </div>
                  <span className="text-igss-700 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>

                <div className="p-4 border-t space-y-4">
                  {(intento.respuestas_pendientes || []).map((resp) => {
                    const g = grades[resp.id] || {};
                    const calificada = !!g.calificada;
                    return (
                      <div
                        key={resp.id}
                        className={`border rounded-lg p-3 ${
                          calificada
                            ? 'border-igss-300 bg-igss-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-800 mb-2">
                          {resp.pregunta_enunciado}
                        </p>
                        <div className="rounded bg-gray-50 border border-gray-200 p-3 mb-3 text-sm text-gray-800 whitespace-pre-wrap">
                          {resp.respuesta_texto || (
                            <span className="italic text-gray-400">(sin respuesta)</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          <Input
                            label={`Puntaje (0 – ${resp.puntaje_max ?? 100})`}
                            type="number"
                            step="0.1"
                            min="0"
                            max={resp.puntaje_max ?? 100}
                            value={g.puntaje ?? ''}
                            onChange={(e) =>
                              updateGrade(resp.id, 'puntaje', e.target.value)
                            }
                            disabled={calificada}
                          />
                          <div className="sm:col-span-2">
                            <Textarea
                              label="Comentario al residente"
                              rows={2}
                              maxLength={1000}
                              value={g.comentario ?? ''}
                              onChange={(e) =>
                                updateGrade(resp.id, 'comentario', e.target.value)
                              }
                              disabled={calificada}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            disabled={calificada}
                            onClick={() => calificarItem(intento.intento_id, resp)}
                          >
                            {calificada ? '✓ Calificada' : 'Calificar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => calificarLote(intento)}
                    >
                      Calificar todas las nuevas
                    </Button>
                  </div>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

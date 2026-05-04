import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import SemaforoBadge from './SemaforoBadge';

const SEVERIDAD_COLOR = {
  CRITICA: 'border-red-500 bg-red-50 text-red-800',
  ALTA: 'border-orange-400 bg-orange-50 text-orange-800',
  MEDIA: 'border-amber-400 bg-amber-50 text-amber-800',
  BAJA: 'border-blue-300 bg-blue-50 text-blue-800',
  INFO: 'border-gray-300 bg-gray-50 text-gray-700',
};

const TIPO_ICON = {
  TAB_HIDDEN: '🪟',
  TAB_FOCUS: '🔁',
  COPY: '📋',
  PASTE: '📥',
  RIGHT_CLICK: '🖱️',
  FULLSCREEN_EXIT: '⛶',
  DEVTOOLS: '🛠️',
  KEY_BLOCKED: '⌨️',
  PASTE_BLOCKED: '🚫',
  HEARTBEAT_GAP: '⏱️',
  RAPID_ANSWER: '⚡',
  STRIKE: '⚠️',
};

function fmtFechaHora(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function relSegundos(start, t) {
  if (!start || !t) return '';
  try {
    const dif = (new Date(t).getTime() - new Date(start).getTime()) / 1000;
    if (Number.isNaN(dif)) return '';
    if (dif < 60) return `+${Math.round(dif)}s`;
    if (dif < 3600) return `+${Math.round(dif / 60)}m`;
    return `+${(dif / 3600).toFixed(1)}h`;
  } catch {
    return '';
  }
}

/**
 * IntentoDetalle — vista profunda de un intento del residente.
 * Path: /docentes/intentos/:id
 *
 * GET /api/docente/intentos/:id/detalle →
 *   { intento: {...}, residente: {...}, examen: {...},
 *     incidentes: [{ id, tipo, severidad, timestamp, detalle }],
 *     respuestas: [{ id, pregunta_enunciado, tipo, respuesta, correcta?,
 *                    puntaje_obtenido, puntaje_max, tiempo_segundos,
 *                    cambios, plagio_sospechoso? }] }
 */
export default function IntentoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { data, loading, error, refetch } = useApi(
    `/api/docente/intentos/${id}/detalle`,
    [id]
  );

  const [showAnular, setShowAnular] = useState(false);
  const [razonAnular, setRazonAnular] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const intento = data?.intento || data?.attempt || data;
  const residente = data?.residente || intento?.residente;
  const examen = data?.examen || intento?.examen;
  const incidentes = useMemo(() => {
    const arr = data?.incidentes || data?.incidents || [];
    return [...arr].sort(
      (a, b) =>
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
  }, [data]);
  const respuestas = useMemo(() => {
    return data?.respuestas || data?.answers || [];
  }, [data]);

  const startIso = intento?.fecha_inicio || intento?.started_at;

  const handleAprobar = async () => {
    if (!confirm('¿Aprobar este intento? La calificación quedará oficial.')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/docente/intentos/${id}/aprobar`, {});
      toast.success('Intento aprobado');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Error al aprobar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnular = async () => {
    if (!razonAnular.trim() || razonAnular.trim().length < 10) {
      toast.warning('Indique una razón de al menos 10 caracteres');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/api/docente/intentos/${id}/anular`, {
        razon: razonAnular.trim(),
      });
      toast.success('Intento anulado');
      setShowAnular(false);
      setRazonAnular('');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Error al anular');
    } finally {
      setActionLoading(false);
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
        Error al cargar: {error?.message || 'No se pudo conectar al servidor'}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div>
        <Link
          to={examen?.id ? `/docentes/examenes/${examen.id}/intentos` : '/docentes/examenes'}
          className="text-xs font-medium text-igss-700 hover:text-igss-900"
        >
          ← Volver a intentos
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-igss-900">
              Intento #{id} ·{' '}
              <span className="text-gray-700">
                {residente?.nombre_completo || `Residente #${intento?.residente_id}`}
              </span>
            </h1>
            <p className="text-sm text-gray-600">
              {examen?.titulo || `Examen #${intento?.examen_id}`} ·{' '}
              {fmtFechaHora(startIso)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SemaforoBadge score={intento?.suspicion_score} />
            <p className="text-xs text-gray-600">
              Puntaje:{' '}
              <span className="font-semibold text-igss-900">
                {intento?.puntaje_total ?? '—'}
              </span>
              {intento?.porcentaje != null && (
                <> · {Number(intento.porcentaje).toFixed(0)}%</>
              )}
            </p>
            <p className="text-xs text-gray-600">
              Estado: <Badge tone="default">{intento?.estado || '—'}</Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <Card className="p-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={handleAprobar}
          disabled={actionLoading || intento?.estado === 'CALIFICADO'}
        >
          ✓ Aprobar intento
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={() => setShowAnular(true)}
          disabled={actionLoading || intento?.estado === 'ANULADO'}
        >
          ✕ Anular intento
        </Button>
        <Link
          to={`/docentes/intentos/${id}/plagio`}
          className="ml-auto text-xs font-medium text-igss-700 hover:text-igss-900 underline"
        >
          Ver respuestas plagio relacionadas →
        </Link>
      </Card>

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Izquierda: timeline incidentes */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Timeline de integridad ({incidentes.length})
          </h2>
          {incidentes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Sin incidentes registrados.
            </p>
          ) : (
            <ul className="space-y-2">
              {incidentes.map((inc) => {
                const sev = (inc.severidad || 'INFO').toUpperCase();
                const cls = SEVERIDAD_COLOR[sev] || SEVERIDAD_COLOR.INFO;
                return (
                  <li
                    key={inc.id || `${inc.timestamp}-${inc.tipo}`}
                    className={`border-l-4 pl-3 py-2 rounded-r ${cls}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span aria-hidden="true">
                          {TIPO_ICON[inc.tipo] || '•'}
                        </span>
                        <span className="text-sm font-semibold truncate">
                          {inc.tipo}
                        </span>
                      </div>
                      <span className="text-xs whitespace-nowrap opacity-80">
                        {relSegundos(startIso, inc.timestamp)} ·{' '}
                        {fmtFechaHora(inc.timestamp).slice(-8)}
                      </span>
                    </div>
                    {inc.detalle && (
                      <p className="text-xs mt-1 break-words">
                        {typeof inc.detalle === 'string'
                          ? inc.detalle
                          : JSON.stringify(inc.detalle)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Derecha: respuestas */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Respuestas ({respuestas.length})
          </h2>
          {respuestas.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Sin respuestas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {respuestas.map((r, idx) => {
                const tiempo = Number(r.tiempo_segundos);
                const muyRapida = !Number.isNaN(tiempo) && tiempo < 2;
                const muchosCambios = Number(r.cambios || 0) > 5;
                const sospechosa = !!r.plagio_sospechoso || muyRapida || muchosCambios;
                return (
                  <li
                    key={r.id || idx}
                    className={`border rounded p-3 ${
                      sospechosa
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">
                          #{idx + 1} · {r.tipo || ''}
                        </p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {r.pregunta_enunciado}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-igss-900 whitespace-nowrap">
                        {r.puntaje_obtenido ?? '—'} / {r.puntaje_max ?? '—'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm bg-white border border-gray-200 rounded p-2 whitespace-pre-wrap">
                      {Array.isArray(r.respuesta)
                        ? r.respuesta.join(', ')
                        : r.respuesta || (
                            <span className="italic text-gray-400">(sin respuesta)</span>
                          )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      {tiempo != null && !Number.isNaN(tiempo) && (
                        <span className={muyRapida ? 'text-red-700 font-semibold' : ''}>
                          ⏱ {tiempo.toFixed(1)}s
                        </span>
                      )}
                      {r.cambios != null && (
                        <span className={muchosCambios ? 'text-red-700 font-semibold' : ''}>
                          ✏ {r.cambios} cambios
                        </span>
                      )}
                      {r.plagio_sospechoso && (
                        <Badge tone="red">Plagio sospechoso</Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Modal anular */}
      <Modal
        open={showAnular}
        onClose={() => setShowAnular(false)}
        title="Anular intento"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Este intento será marcado como anulado y se conservará el historial. Indique
            la razón:
          </p>
          <Textarea
            label="Razón"
            rows={4}
            maxLength={500}
            value={razonAnular}
            onChange={(e) => setRazonAnular(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAnular(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={actionLoading}
              onClick={handleAnular}
            >
              Confirmar anulación
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

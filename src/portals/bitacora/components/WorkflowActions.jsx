import { useMemo, useRef, useState } from 'react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import { useToast } from '../../../contexts/ToastContext';
import { hasBitacoraCapability, isBitacoraSecretary } from '../../../lib/permissions';
import { bitacoraApi, newIdempotencyKey } from '../api';
import { DOCUMENT_STATUS, PROGRAM_STATUS } from '../model';

const META = {
  programar: { label: 'Programar', tone: 'primary', title: 'Programar actividad' },
  'marcar-realizada': { label: 'Marcar realizada', tone: 'primary', title: 'Confirmar realización' },
  'marcar-no-realizada': {
    label: 'No realizada',
    tone: 'secondary',
    title: 'Marcar actividad como no realizada',
    reason: true,
  },
  cancelar: { label: 'Cancelar', tone: 'danger', title: 'Cancelar actividad', reason: true },
  enviar: { label: 'Enviar a control', tone: 'primary', title: 'Enviar documentación' },
  devolver: {
    label: 'Solicitar corrección',
    tone: 'secondary',
    title: 'Devolver con observaciones',
    reason: true,
  },
  completar: {
    label: 'Marcar completa',
    tone: 'primary',
    title: 'Cerrar documentación como completa',
  },
  reabrir: {
    label: 'Reabrir',
    tone: 'secondary',
    title: 'Reabrir documentación',
    reason: true,
  },
};

const SCOPED_ACTIONS = new Set([
  'programar',
  'marcar-realizada',
  'marcar-no-realizada',
  'cancelar',
]);

function explicitPermission(activity, action) {
  const permissions = activity?.permissions;
  if (!permissions) return null;
  if (Array.isArray(permissions)) {
    const normalized = permissions.map((item) => String(item).toLowerCase());
    return normalized.some(
      (item) => item === action || item.endsWith(`.${action}`) || item.endsWith(`:${action}`)
    );
  }
  if (typeof permissions === 'object') {
    if (action in permissions) return Boolean(permissions[action]);
    const underscored = action.replaceAll('-', '_');
    if (underscored in permissions) return Boolean(permissions[underscored]);
  }
  return null;
}

function allowed(activity, action, fallback) {
  const explicit = explicitPermission(activity, action);
  return explicit === null ? fallback : explicit;
}

export default function WorkflowActions({ activity, user, onChanged }) {
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState('single');
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const idempotencyKeyRef = useRef(null);
  const secretary = isBitacoraSecretary(user);
  const collaborator = hasBitacoraCapability(user, 'submit');
  const hasSeries = Boolean(
    activity.serie_id || activity.series_id || activity.recurrencia?.serie_id
  );
  const showsScope = Boolean(selected && hasSeries && SCOPED_ACTIONS.has(selected));

  const close = () => {
    setSelected(null);
    setReason('');
    setScope('single');
    idempotencyKeyRef.current = null;
  };

  const actions = useMemo(() => {
    const result = [];
    if (activity.estado_programacion === PROGRAM_STATUS.BORRADOR) {
      if (allowed(activity, 'programar', hasBitacoraCapability(user, 'schedule'))) result.push('programar');
    }
    if (activity.estado_programacion === PROGRAM_STATUS.PROGRAMADA) {
      if (allowed(activity, 'marcar-realizada', collaborator || secretary)) result.push('marcar-realizada');
      if (allowed(activity, 'marcar-no-realizada', collaborator || secretary)) result.push('marcar-no-realizada');
      if (allowed(activity, 'cancelar', secretary)) result.push('cancelar');
    }
    if (
      activity.estado_programacion === PROGRAM_STATUS.REALIZADA
      && [DOCUMENT_STATUS.NO_INICIADA, DOCUMENT_STATUS.BORRADOR, DOCUMENT_STATUS.REQUIERE_CORRECCION]
        .includes(activity.estado_documentacion)
      && allowed(activity, 'enviar', collaborator)
    ) {
      result.push('enviar');
    }
    if (activity.estado_documentacion === DOCUMENT_STATUS.ENVIADA && secretary) {
      if (allowed(activity, 'devolver', true)) result.push('devolver');
      if (allowed(activity, 'completar', hasBitacoraCapability(user, 'complete'))) result.push('completar');
    }
    if (activity.estado_documentacion === DOCUMENT_STATUS.COMPLETA && secretary) {
      if (allowed(activity, 'reabrir', hasBitacoraCapability(user, 'reopen'))) result.push('reabrir');
    }
    return result;
  }, [activity, collaborator, secretary, user]);

  const run = async () => {
    const meta = META[selected];
    if (meta.reason && !reason.trim()) return;
    setSubmitting(true);
    try {
      const payload = meta.reason
        ? { motivo: reason.trim(), observaciones: reason.trim() }
        : {};
      const updated = await bitacoraApi.action(activity.id, selected, payload, {
        version: activity.version,
        scope: showsScope ? scope : 'single',
        idempotencyKey: idempotencyKeyRef.current,
      });
      toast.success(`${meta.label}: cambio registrado.`);
      setConflict(false);
      close();
      onChanged?.(updated);
    } catch (error) {
      if (error?.status === 409 || error?.code === 'VERSION_CONFLICT') {
        setConflict(true);
        close();
        toast.error('Otra persona modificó esta actividad. Cargue la versión reciente antes de continuar.');
        return;
      }
      const missing = error?.context?.missing_fields || error?.context?.faltantes;
      const suffix = Array.isArray(missing) && missing.length > 0 ? ` Faltan: ${missing.join(', ')}.` : '';
      toast.error(`${error?.message || 'No se pudo aplicar el cambio.'}${suffix}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (actions.length === 0) return null;

  return (
    <>
      {conflict && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-3" role="alert">
          <p className="text-sm font-semibold text-red-900">
            Otra persona modificó esta actividad; no se aplicó su acción.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="min-h-11"
            onClick={() => {
              setConflict(false);
              onChanged?.();
            }}
          >
            Cargar versión reciente
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Acciones del flujo documental">
        {actions.map((action) => (
          <Button
            key={action}
            variant={META[action].tone}
            size="sm"
            className="min-h-11"
            onClick={() => {
              setConflict(false);
              setScope('single');
              idempotencyKeyRef.current = newIdempotencyKey(action);
              setSelected(action);
            }}
          >
            {META[action].label}
          </Button>
        ))}
      </div>

      <Modal
        open={Boolean(selected)}
        title={selected ? META[selected].title : ''}
        onClose={() => !submitting && close()}
        footer={
          <>
            <Button variant="secondary" className="min-h-11" disabled={submitting} onClick={close}>
              Volver
            </Button>
            <Button
              variant={selected ? META[selected].tone : 'primary'}
              className="min-h-11"
              loading={submitting}
              disabled={selected && META[selected].reason && reason.trim().length < 3}
              onClick={run}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Esta acción quedará registrada en la auditoría con su usuario, fecha y versión.
        </p>
        {selected && META[selected].reason && (
          <Textarea
            name="workflow-reason"
            label={selected === 'devolver' ? 'Observaciones para corregir' : 'Motivo'}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-4"
            required
            hint="Escriba al menos 3 caracteres; quedará registrado en auditoría."
            maxLength={1000}
          />
        )}
        {showsScope && (
          <fieldset className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3" disabled={submitting}>
            <legend className="px-1 text-sm font-bold text-blue-950">Alcance en la serie</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                ['single', 'Solo esta ocurrencia'],
                ['future', 'Esta y las futuras'],
                ['series', 'Toda la serie'],
              ].map(([value, label]) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-blue-950">
                  <input type="radio" name="workflow-scope" value={value} checked={scope === value} onChange={() => setScope(value)} className="h-5 w-5 text-igss-700" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Modal>
    </>
  );
}

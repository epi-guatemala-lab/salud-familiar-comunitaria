import { useEffect, useRef, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { fmtDateTime } from '../../../lib/format';
import {
  ACCEPTED_EVIDENCE_TYPES,
  ACTIVITY_TYPES,
  buildRRule,
  DATE_PRECISION_LABELS,
  DOCUMENT_STATUS_META,
  formatBytes,
  initialAgreement,
  MODALITIES,
  PRIORITIES,
  PROGRAM_STATUS_META,
  REPORT_FIELDS,
  parseRRule,
  rewriteRRule,
} from '../model';
import StatusBadge from './StatusBadge';
import WorkflowActions from './WorkflowActions';
import { newIdempotencyKey } from '../api';

export const WIZARD_STEPS = [
  'Programación',
  'Participantes',
  'Informe',
  'Acuerdos',
  'Evidencias',
  'Revisión',
];

function personLabel(person) {
  const details = [person.username ? `@${person.username}` : '', person.unidad || '']
    .filter(Boolean)
    .join(' · ');
  return `${person.nombre || person.username}${details ? ` (${details})` : ''}`;
}

function InternalPersonSelect({
  name,
  label = 'Cuenta institucional',
  value,
  currentName,
  people = [],
  loading = false,
  required = false,
  disabled = false,
  className = '',
  onSearch,
  onChange,
}) {
  const [search, setSearch] = useState('');
  const currentExists = people.some((person) => String(person.id) === String(value));
  return (
    <div className={`space-y-2 ${className}`}>
      {onSearch && (
        <div className="flex items-end gap-2">
          <Input
            name={`${name}-search`}
            label="Buscar cuenta"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSearch(search.trim());
              }
            }}
            disabled={disabled}
            className="min-w-0 flex-1"
            placeholder="Nombre, usuario o unidad"
            maxLength={200}
          />
          <Button
            variant="secondary"
            size="sm"
            className="min-h-11"
            loading={loading}
            disabled={disabled}
            onClick={() => onSearch(search.trim())}
          >
            Buscar
          </Button>
        </div>
      )}
      <Select
        name={name}
        label={label}
        value={value || ''}
        onChange={(event) => {
          const selected = people.find((person) => String(person.id) === event.target.value);
          onChange(selected || null);
        }}
        required={required}
        disabled={disabled || loading}
        hint={loading ? 'Cargando cuentas autorizadas…' : 'Solo aparecen cuentas activas con rol de Bitácora.'}
      >
        <option value="">{required ? 'Seleccione una cuenta…' : 'Persona externa o sin cuenta vinculada'}</option>
        {value && !currentExists && (
          <option value={value}>{currentName || `Cuenta #${value}`} (registro histórico)</option>
        )}
        {people.map((person) => (
          <option key={person.id} value={person.id}>{personLabel(person)}</option>
        ))}
      </Select>
    </div>
  );
}

function CustomFieldInput({ field, value, disabled, onChange }) {
  const common = {
    name: `custom-field-${field.clave}`,
    label: field.nombre,
    required: Boolean(field.requerido),
    disabled,
  };
  if (field.tipo === 'BOOLEAN') {
    return (
      <Select
        {...common}
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(event) => onChange(
          event.target.value === '' ? null : event.target.value === 'true'
        )}
      >
        <option value="">Seleccione…</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </Select>
    );
  }
  if (field.tipo === 'SELECT') {
    return (
      <Select {...common} value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">Seleccione…</option>
        {(field.opciones || []).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      {...common}
      type={field.tipo === 'NUMBER' ? 'number' : field.tipo === 'DATE' ? 'date' : 'text'}
      step={field.tipo === 'NUMBER' ? 'any' : undefined}
      value={value ?? ''}
      onChange={(event) => {
        if (event.target.value === '') {
          onChange(null);
        } else if (field.tipo === 'NUMBER') {
          onChange(Number(event.target.value));
        } else {
          onChange(event.target.value);
        }
      }}
      maxLength={field.tipo === 'TEXT' ? 10000 : undefined}
    />
  );
}

export function StepNavigation({ current, onSelect, disabled = false }) {
  const navigationRef = useRef(null);

  useEffect(() => {
    const navigation = navigationRef.current;
    const active = navigation?.querySelector('[aria-current="step"]');
    if (!navigation || !active) return;
    const centeredLeft = active.offsetLeft + (active.offsetWidth / 2) - (navigation.clientWidth / 2);
    navigation.scrollTo?.({
      left: Math.max(0, centeredLeft),
      behavior: 'auto',
    });
  }, [current]);

  return (
    <nav
      ref={navigationRef}
      aria-label="Pasos de la actividad"
      aria-busy={disabled || undefined}
      className="overflow-x-auto pb-1"
    >
      <ol className="flex min-w-max gap-2">
        {WIZARD_STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              disabled={disabled}
              aria-current={current === index ? 'step' : undefined}
              className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60 ${
                current === index
                  ? 'border-igss-700 bg-igss-700 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${current === index ? 'bg-white text-igss-800' : 'bg-gray-100 text-gray-700'}`}>
                {index + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ProgrammingStep({
  draft,
  setDraft,
  disabled,
  scope,
  onScope,
  hasSeries,
  requiresReason,
  typeOptions = [],
  classificationOptions = [],
  tagOptions = [],
  customFields = [],
  referencesLoading = false,
}) {
  const set = (field) => (event) => setDraft((value) => ({ ...value, [field]: event.target.value }));
  const setType = (event) => {
    const selected = typeOptions.find((item) => String(item.id) === event.target.value);
    setDraft((current) => ({
      ...current,
      tipo: selected?.nombre || event.target.value,
      tipo_valor_id: selected?.id || '',
    }));
  };
  const setRecurrence = (field, value) => setDraft((current) => {
    let recurrence = { ...current.recurrencia, [field]: value };
    if (field === 'rrule') {
      const parsed = parseRRule(value);
      if (parsed?.frecuencia) recurrence = { ...recurrence, ...parsed, rrule: value };
    } else if (
      current.recurrencia.rrule?.trim()
      && ['frecuencia', 'intervalo', 'fin_tipo', 'hasta', 'conteo'].includes(field)
    ) {
      recurrence.rrule = rewriteRRule(current.recurrencia.rrule, recurrence);
    }
    return { ...current, recurrencia: recurrence };
  });
  const selectedTags = (draft.etiquetas || []).map(String);
  const historicalTags = (draft.etiqueta_detalles || []).filter((current) => (
    !tagOptions.some((option) => String(option.id) === String(current.id))
  ));
  const availableTags = [...tagOptions, ...historicalTags];
  const toggleTag = (tag) => setDraft((current) => {
    const identity = tag.id || tag.nombre;
    const selected = (current.etiquetas || []).some((value) => String(value) === String(identity));
    return {
      ...current,
      etiquetas: selected
        ? current.etiquetas.filter((value) => String(value) !== String(identity))
        : [...current.etiquetas, identity],
    };
  });
  const setCustomField = (key, value) => setDraft((current) => ({
    ...current,
    campos_personalizados: { ...current.campos_personalizados, [key]: value },
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="activity-title" label="Título" value={draft.titulo} onChange={set('titulo')} required disabled={disabled} className="md:col-span-2" maxLength={500} />
        <Textarea name="objective" label="Objetivo" value={draft.objetivo} onChange={set('objetivo')} required disabled={disabled} className="md:col-span-2" maxLength={10000} />
        <Select
          name="activity-type"
          label="Tipo de actividad"
          value={typeOptions.length > 0 ? draft.tipo_valor_id || '' : draft.tipo}
          onChange={setType}
          required
          disabled={disabled || referencesLoading}
          hint={referencesLoading ? 'Cargando catálogo…' : undefined}
        >
          <option value="">Seleccione…</option>
          {typeOptions.length > 0
            && draft.tipo_valor_id
            && !typeOptions.some((item) => String(item.id) === String(draft.tipo_valor_id))
            && <option value={draft.tipo_valor_id}>{draft.tipo || `Tipo histórico #${draft.tipo_valor_id}`}</option>}
          {typeOptions.length > 0
            ? typeOptions.map((type) => <option key={type.id} value={type.id}>{type.nombre}</option>)
            : ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </Select>
        <Select name="modality" label="Modalidad" value={draft.modalidad} onChange={set('modalidad')} required disabled={disabled}>
          <option value="">Seleccione…</option>
          {MODALITIES.map((modality) => <option key={modality.value} value={modality.value}>{modality.label}</option>)}
        </Select>
        <Input name="unit-place" label="Unidad o lugar" value={draft.unidad_lugar} onChange={set('unidad_lugar')} required disabled={disabled} maxLength={500} />
        <Input name="organizer" label="Organizador" value={draft.organizador} onChange={set('organizador')} required disabled={disabled} maxLength={500} />
        <Input name="start-at" type="datetime-local" label="Inicio" value={draft.inicio_at} onChange={set('inicio_at')} required disabled={disabled} />
        <Input name="end-at" type="datetime-local" label="Finalización" value={draft.fin_at} onChange={set('fin_at')} required disabled={disabled} />
        <Select name="priority" label="Prioridad" value={draft.prioridad} onChange={set('prioridad')} disabled={disabled}>
          {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </Select>
        <Select
          name="classification"
          label="Clasificación"
          value={draft.clasificacion_id || ''}
          onChange={set('clasificacion_id')}
          disabled={disabled || referencesLoading}
          hint={referencesLoading ? 'Cargando catálogo…' : 'El catálogo se gestiona desde el panel administrativo.'}
        >
          <option value="">Sin clasificación</option>
          {draft.clasificacion_id
            && !classificationOptions.some((item) => String(item.id) === String(draft.clasificacion_id))
            && <option value={draft.clasificacion_id}>Clasificación histórica #{draft.clasificacion_id}</option>}
          {classificationOptions.map((classification) => (
            <option key={classification.id} value={classification.id}>{classification.nombre}</option>
          ))}
        </Select>
      </div>

      {(availableTags.length > 0 || customFields.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Clasificación administrable">
          {availableTags.length > 0 && (
            <fieldset className="rounded-xl border border-gray-200 p-4" disabled={disabled || referencesLoading}>
              <legend className="px-1 font-bold text-gray-900">Etiquetas</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const identity = tag.id || tag.nombre;
                  return (
                    <label key={identity} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(String(identity))}
                        onChange={() => toggleTag(tag)}
                        className="h-5 w-5 rounded text-igss-700"
                      />
                      {tag.color && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden="true" />}
                      {tag.nombre}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          {customFields.length > 0 && (
            <fieldset className="rounded-xl border border-gray-200 p-4" disabled={disabled || referencesLoading}>
              <legend className="px-1 font-bold text-gray-900">Campos institucionales</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {customFields.map((field) => (
                  <CustomFieldInput
                    key={field.clave}
                    field={field}
                    value={draft.campos_personalizados?.[field.clave]}
                    disabled={disabled || referencesLoading}
                    onChange={(value) => setCustomField(field.clave, value)}
                  />
                ))}
              </div>
            </fieldset>
          )}
        </section>
      )}

      <fieldset className="rounded-xl border border-gray-200 p-4" disabled={disabled}>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold text-gray-900">
          <input
            type="checkbox"
            checked={draft.recurrencia.enabled}
            onChange={(event) => setRecurrence('enabled', event.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-igss-700"
          />
          Actividad recurrente
        </label>
        {draft.recurrencia.enabled && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Select name="frequency" label="Frecuencia" value={draft.recurrencia.frecuencia} onChange={(event) => setRecurrence('frecuencia', event.target.value)}>
              <option value="DAILY">Diaria</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensual</option>
              <option value="YEARLY">Anual</option>
            </Select>
            <Input name="interval" type="number" min="1" max="365" label="Cada cuántos períodos" value={draft.recurrencia.intervalo} onChange={(event) => setRecurrence('intervalo', event.target.value)} />
            <Select name="recurrence-end" label="Finaliza por" value={draft.recurrencia.fin_tipo} onChange={(event) => setRecurrence('fin_tipo', event.target.value)}>
              <option value="fecha">Fecha</option>
              <option value="conteo">Número de ocurrencias</option>
            </Select>
            {draft.recurrencia.fin_tipo === 'fecha' ? (
              <Input name="until" type="date" label="Última fecha" value={draft.recurrencia.hasta} onChange={(event) => setRecurrence('hasta', event.target.value)} required />
            ) : (
              <Input name="count" type="number" min="2" max="2000" label="Ocurrencias" value={draft.recurrencia.conteo} onChange={(event) => setRecurrence('conteo', event.target.value)} required />
            )}
            <Input
              name="rrule"
              label="RRULE avanzada (opcional)"
              value={draft.recurrencia.rrule}
              onChange={(event) => setRecurrence('rrule', event.target.value)}
              className="md:col-span-2"
              placeholder="FREQ=WEEKLY;BYDAY=MO,WE;COUNT=20"
              hint="Si la completa, esta regla RFC 5545 reemplaza las opciones anteriores y debe incluir COUNT o UNTIL."
              maxLength={500}
            />
          </div>
        )}
      </fieldset>

      {requiresReason && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4">
          <Textarea
            name="reschedule-reason"
            label="Motivo de reprogramación"
            value={draft.motivo || ''}
            onChange={set('motivo')}
            disabled={disabled}
            required
            maxLength={4000}
            hint="El motivo es obligatorio y quedará en la auditoría."
          />
        </div>
      )}

      {hasSeries && (
        <fieldset className="rounded-xl border border-blue-200 bg-blue-50 p-4" disabled={disabled}>
          <legend className="px-1 font-bold text-blue-950">Al guardar cambios de programación</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {[
              ['single', 'Solo esta ocurrencia'],
              ['future', 'Esta y las futuras'],
              ['series', 'Toda la serie'],
            ].map(([value, label]) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold">
                <input type="radio" name="recurrence-scope" value={value} checked={scope === value} onChange={() => onScope(value)} className="h-5 w-5 text-igss-700" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

export function ParticipantsStep({
  draft,
  setDraft,
  disabled,
  people = [],
  peopleLoading = false,
  onSearchPeople,
}) {
  const update = (index, field, value) => setDraft((current) => ({
    ...current,
    participantes: current.participantes.map((participant, i) => (
      i === index ? { ...participant, [field]: value } : participant
    )),
  }));
  const add = () => setDraft((current) => ({
    ...current,
    participantes: [...current.participantes, { nombre: '', funcion: '', convocado: true, asistio: null, responsable_documental: false }],
  }));
  const remove = (index) => setDraft((current) => ({
    ...current,
    participantes: current.participantes.filter((_, i) => i !== index),
  }));
  const selectPerson = (index, person) => setDraft((current) => ({
    ...current,
    participantes: current.participantes.map((participant, i) => i === index ? {
      ...participant,
      usuario_id: person?.id || '',
      nombre: person?.nombre || '',
      nombre_externo: '',
      organizacion_externa: '',
    } : participant),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-igss-900">Participantes</h2>
        <p className="text-sm text-gray-600">Registre convocados y, después de la actividad, confirme su asistencia real.</p>
      </div>
      {draft.participantes.map((participant, index) => (
        <fieldset key={participant.id || `participant-${index}`} className="rounded-xl border border-gray-200 p-4" disabled={disabled}>
          <legend className="px-1 text-sm font-bold text-gray-800">Participante {index + 1}</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <InternalPersonSelect
              name={`participant-user-${index}`}
              label="Cuenta institucional (opcional)"
              value={participant.usuario_id}
              currentName={participant.nombre}
              people={people}
              loading={peopleLoading}
              disabled={disabled}
              onSearch={onSearchPeople}
              onChange={(person) => selectPerson(index, person)}
            />
            <Input
              name={`participant-name-${index}`}
              label={participant.usuario_id ? 'Nombre de la cuenta' : 'Nombre completo de la persona externa'}
              value={participant.nombre || participant.nombre_externo || ''}
              onChange={(event) => update(index, 'nombre', event.target.value)}
              readOnly={Boolean(participant.usuario_id)}
              required
              maxLength={200}
              hint={participant.usuario_id ? 'El nombre proviene de la cuenta institucional seleccionada.' : undefined}
            />
            <Input name={`participant-role-${index}`} label="Función" value={participant.funcion || ''} onChange={(event) => update(index, 'funcion', event.target.value)} maxLength={200} />
            {!participant.usuario_id && <Input name={`participant-org-${index}`} label="Organización externa (si corresponde)" value={participant.organizacion_externa || ''} onChange={(event) => update(index, 'organizacion_externa', event.target.value)} maxLength={200} />}
            <Select
              name={`attendance-${index}`}
              label="Asistencia real"
              value={participant.asistio === true ? 'yes' : participant.asistio === false ? 'no' : ''}
              onChange={(event) => update(index, 'asistio', event.target.value === '' ? null : event.target.value === 'yes')}
            >
              <option value="">Pendiente de confirmar</option>
              <option value="yes">Asistió</option>
              <option value="no">No asistió</option>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={participant.convocado !== false} onChange={(event) => update(index, 'convocado', event.target.checked)} className="h-5 w-5 rounded text-igss-700" /> Convocado</label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(participant.responsable_documental)} onChange={(event) => update(index, 'responsable_documental', event.target.checked)} className="h-5 w-5 rounded text-igss-700" /> Responsable documental</label>
            </div>
            {draft.participantes.length > 1 && <Button variant="ghost" size="sm" className="min-h-11 text-red-700" onClick={() => remove(index)}>Quitar</Button>}
          </div>
        </fieldset>
      ))}
      <Button variant="secondary" className="min-h-11" onClick={add} disabled={disabled}>+ Agregar participante</Button>
    </div>
  );
}

export function ReportStep({ draft, setDraft, disabled }) {
  const update = (field, value) => setDraft((current) => ({
    ...current,
    informe: { ...current.informe, [field]: value },
  }));
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-igss-900">Informe de la actividad</h2>
        <p className="text-sm text-gray-600">Describa cada apartado con texto concreto. Si no hubo dificultades, documéntelo expresamente.</p>
      </div>
      {REPORT_FIELDS.map(([field, label]) => (
        <Textarea
          key={field}
          name={field}
          label={label}
          value={draft.informe[field] || ''}
          onChange={(event) => update(field, event.target.value)}
          disabled={disabled}
          required
          rows={field === 'que_ocurrio' ? 6 : 4}
          maxLength={field === 'que_ocurrio' ? 30000 : 20000}
          hint={field === 'dificultades' ? 'Ejemplo válido: “No se presentaron dificultades durante la actividad”.' : undefined}
        />
      ))}
    </div>
  );
}

function ResponsibleFields({
  responsible,
  agreementIndex,
  index,
  onChange,
  onRemove,
  disabled,
  canRemove,
  people,
  peopleLoading,
  onSearchPeople,
}) {
  const changeType = (value) => {
    onChange('tipo', value);
    onChange('usuario_id', '');
    onChange('nombre', '');
    onChange('nombre_externo', '');
    onChange('organizacion_externa', '');
  };
  const selectPerson = (person) => {
    onChange('usuario_id', person?.id || '');
    onChange('nombre', person?.nombre || '');
    onChange('nombre_externo', '');
    onChange('organizacion_externa', '');
  };
  return (
    <div className="grid gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-3">
      <Select name={`responsible-type-${agreementIndex}-${index}`} label="Tipo" value={responsible.tipo || 'interno'} onChange={(event) => changeType(event.target.value)} disabled={disabled}>
        <option value="interno">Interno</option>
        <option value="externo">Externo</option>
      </Select>
      {responsible.tipo === 'externo' ? (
        <>
          <Input name={`responsible-name-${agreementIndex}-${index}`} label="Nombre" value={responsible.nombre || responsible.nombre_externo || ''} onChange={(event) => onChange('nombre', event.target.value)} disabled={disabled} required />
          <Input name={`responsible-org-${agreementIndex}-${index}`} label="Organización" value={responsible.organizacion_externa || ''} onChange={(event) => onChange('organizacion_externa', event.target.value)} disabled={disabled} />
        </>
      ) : (
        <InternalPersonSelect
          name={`responsible-user-${agreementIndex}-${index}`}
          label="Cuenta institucional"
          value={responsible.usuario_id}
          currentName={responsible.nombre}
          people={people}
          loading={peopleLoading}
          required
          disabled={disabled}
          className="md:col-span-2"
          onSearch={onSearchPeople}
          onChange={selectPerson}
        />
      )}
      {canRemove && <Button variant="ghost" size="sm" className="min-h-11 text-red-700 md:col-start-3" onClick={onRemove} disabled={disabled}>Quitar responsable</Button>}
    </div>
  );
}

export function AgreementsStep({
  draft,
  setDraft,
  disabled,
  onArchive,
  people = [],
  peopleLoading = false,
  onSearchPeople,
  hasUnsavedChanges = false,
}) {
  const update = (agreementIndex, field, value) => setDraft((current) => ({
    ...current,
    acuerdos: current.acuerdos.map((agreement, index) => (
      index === agreementIndex ? { ...agreement, [field]: value } : agreement
    )),
  }));
  const updateResponsible = (agreementIndex, responsibleIndex, field, value) => setDraft((current) => ({
    ...current,
    acuerdos: current.acuerdos.map((agreement, index) => index === agreementIndex ? {
      ...agreement,
      responsables: agreement.responsables.map((responsible, rIndex) => (
        rIndex === responsibleIndex ? { ...responsible, [field]: value } : responsible
      )),
    } : agreement),
  }));
  const addResponsible = (agreementIndex) => setDraft((current) => ({
    ...current,
    acuerdos: current.acuerdos.map((agreement, index) => index === agreementIndex ? {
      ...agreement,
      responsables: [...agreement.responsables, { tipo: 'interno', usuario_id: '', nombre: '' }],
    } : agreement),
  }));
  const removeResponsible = (agreementIndex, responsibleIndex) => setDraft((current) => ({
    ...current,
    acuerdos: current.acuerdos.map((agreement, index) => index === agreementIndex ? {
      ...agreement,
      responsables: agreement.responsables.filter((_, rIndex) => rIndex !== responsibleIndex),
    } : agreement),
  }));
  const removeAgreement = (agreementIndex) => setDraft((current) => ({
    ...current,
    acuerdos: current.acuerdos.filter((_, index) => index !== agreementIndex),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-igss-900">Acuerdos y responsables</h2>
        <p className="text-sm text-gray-600">Cada actividad futura requiere al menos un acuerdo, con vencimiento y uno o más responsables.</p>
      </div>
      {draft.acuerdos.map((agreement, agreementIndex) => (
        <fieldset key={agreement.id || `agreement-${agreementIndex}`} className="rounded-xl border border-gray-200 p-4" disabled={disabled}>
          <legend className="px-1 text-sm font-bold text-gray-800">Acuerdo {agreementIndex + 1}</legend>
          <div className="space-y-4">
            <Textarea name={`agreement-description-${agreementIndex}`} label="Descripción" value={agreement.descripcion || ''} onChange={(event) => update(agreementIndex, 'descripcion', event.target.value)} required disabled={disabled} maxLength={20000} />
            <div className="grid gap-4 md:grid-cols-3">
              <Input name={`agreement-due-${agreementIndex}`} type="datetime-local" label="Vencimiento" value={agreement.vencimiento_at || ''} onChange={(event) => update(agreementIndex, 'vencimiento_at', event.target.value)} required disabled={disabled} />
              <Select name={`agreement-priority-${agreementIndex}`} label="Prioridad" value={agreement.prioridad || 'MEDIA'} onChange={(event) => update(agreementIndex, 'prioridad', event.target.value)} disabled={disabled}>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </Select>
              <Select name={`agreement-status-${agreementIndex}`} label="Estado" value={agreement.estado || 'PENDIENTE'} onChange={(event) => update(agreementIndex, 'estado', event.target.value)} disabled={disabled}>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROGRESO">En progreso</option>
                <option value="CUMPLIDO">Cumplido</option>
                <option value="VENCIDO">Vencido</option>
                <option value="CANCELADO">Cancelado</option>
              </Select>
            </div>
            <Textarea name={`agreement-evidence-${agreementIndex}`} label="Evidencia textual de cumplimiento (cuando corresponda)" value={agreement.evidencia_cumplimiento || ''} onChange={(event) => update(agreementIndex, 'evidencia_cumplimiento', event.target.value)} disabled={disabled} maxLength={20000} />
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-800">Responsables</h3>
              {agreement.responsables.map((responsible, index) => (
                <ResponsibleFields
                  key={responsible.id || `responsible-${index}`}
                  responsible={responsible}
                  agreementIndex={agreementIndex}
                  index={index}
                  disabled={disabled}
                  canRemove={agreement.responsables.length > 1}
                  people={people}
                  peopleLoading={peopleLoading}
                  onSearchPeople={onSearchPeople}
                  onChange={(field, value) => updateResponsible(agreementIndex, index, field, value)}
                  onRemove={() => removeResponsible(agreementIndex, index)}
                />
              ))}
              <Button variant="secondary" size="sm" className="min-h-11" onClick={() => addResponsible(agreementIndex)} disabled={disabled}>+ Agregar responsable</Button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            {agreement.id ? (
              <Button variant="ghost" size="sm" className="min-h-11 text-red-700" onClick={() => onArchive(agreement)} disabled={disabled || hasUnsavedChanges}>Archivar acuerdo</Button>
            ) : draft.acuerdos.length > 1 ? (
              <Button variant="ghost" size="sm" className="min-h-11 text-red-700" onClick={() => removeAgreement(agreementIndex)} disabled={disabled}>Quitar acuerdo sin guardar</Button>
            ) : null}
          </div>
        </fieldset>
      ))}
      <Button variant="secondary" className="min-h-11" onClick={() => setDraft((current) => ({ ...current, acuerdos: [...current.acuerdos, initialAgreement()] }))} disabled={disabled}>+ Agregar acuerdo</Button>
    </div>
  );
}

function ReplacementForm({ evidence, onReplace, disabled, onDirtyChange }) {
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey('sustituir'));
  const dirty = Boolean(file || reason.trim());
  useEffect(() => {
    onDirtyChange?.(evidence.id, dirty);
  }, [dirty, evidence.id, onDirtyChange]);
  useEffect(() => () => {
    onDirtyChange?.(evidence.id, false);
  }, [evidence.id, onDirtyChange]);
  const submit = async () => {
    setWorking(true);
    try {
      await onReplace(evidence, file, reason, idempotencyKey);
      setFile(null);
      setReason('');
      setIdempotencyKey(newIdempotencyKey('sustituir'));
    } finally {
      setWorking(false);
    }
  };
  return (
    <details className="mt-3 rounded-lg border border-gray-200 p-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-igss-800">Sustituir con una nueva versión</summary>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <Input name={`replacement-reason-${evidence.id}`} label="Motivo de sustitución" value={reason} onChange={(event) => setReason(event.target.value)} disabled={disabled} required />
        <Input name={`replacement-file-${evidence.id}`} type="file" label="Nuevo archivo" accept={ACCEPTED_EVIDENCE_TYPES.join(',')} onChange={(event) => setFile(event.target.files?.[0] || null)} disabled={disabled} required />
      </div>
      <Button variant="secondary" size="sm" className="mt-3 min-h-11" onClick={submit} loading={working} disabled={disabled || !file || reason.trim().length < 3}>Guardar nueva versión</Button>
    </details>
  );
}

export function EvidenceStep({
  draft,
  pendingFiles,
  onFiles,
  disabled,
  onDownload,
  onReplace,
  wizardDraftDirty = false,
  replacementDirtyIds = new Set(),
  onReplacementDirty,
  resetKey = 0,
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-igss-900">Evidencias opcionales</h2>
        <p className="text-sm text-gray-600">La evidencia textual del informe sí es obligatoria. Los archivos son complementarios.</p>
      </div>
      <div className="rounded-xl border border-dashed border-igss-300 bg-igss-50 p-4">
        <Input
          name="evidence-files"
          type="file"
          label="Agregar archivos"
          accept={ACCEPTED_EVIDENCE_TYPES.join(',')}
          multiple
          disabled={disabled || replacementDirtyIds.size > 0}
          onChange={(event) => onFiles(event.target.files)}
          hint="PDF, DOCX, XLSX, PPTX, PNG o JPEG. Máximo 25 MiB por archivo y 100 MiB por actividad."
        />
        {pendingFiles.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            {pendingFiles.map((file) => (
              <li key={`${file.name}-${file.lastModified}`} className="break-all">
                {file.name} · {formatBytes(file.size)} · pendiente de subir
              </li>
            ))}
          </ul>
        )}
      </div>
      <section aria-labelledby="uploaded-evidence-title">
        <h3 id="uploaded-evidence-title" className="font-bold text-gray-900">Archivos registrados</h3>
        {draft.evidencias.length === 0 ? (
          <p className="mt-2 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No se adjuntaron archivos.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {draft.evidencias.map((evidence) => (
              <article key={evidence.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block break-all text-sm text-gray-900">{evidence.nombre_original || evidence.nombre}</strong>
                    <span className="text-xs text-gray-500">{formatBytes(evidence.tamano_bytes || evidence.tamano || 0)} · {evidence.estado || 'DISPONIBLE'}</span>
                  </div>
                  <Button variant="secondary" size="sm" className="min-h-11" onClick={() => onDownload(evidence)} disabled={evidence.estado && evidence.estado !== 'DISPONIBLE'}>Descargar</Button>
                </div>
                {(!evidence.estado || evidence.estado === 'DISPONIBLE') && (
                  <ReplacementForm
                    key={`${evidence.id}-${resetKey}`}
                    evidence={evidence}
                    onReplace={onReplace}
                    onDirtyChange={onReplacementDirty}
                    disabled={
                      disabled
                      || wizardDraftDirty
                      || (replacementDirtyIds.size > 0 && !replacementDirtyIds.has(evidence.id))
                    }
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function localDateTimeLabel(value) {
  if (!value) return '';
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}:00-06:00`;
  return fmtDateTime(normalized);
}

function participantName(participant) {
  return participant.nombre
    || participant.nombre_externo
    || participant.usuario_nombre
    || (participant.usuario_id ? `Cuenta institucional #${participant.usuario_id}` : 'Participante sin nombre');
}

function attendanceLabel(participant) {
  if (participant.asistio === true || participant.asistencia === 'ASISTIO') return 'Asistió';
  if (participant.asistio === false || participant.asistencia === 'NO_ASISTIO') return 'No asistió';
  return 'Pendiente de confirmar';
}

function responsibleName(responsible) {
  return responsible.nombre
    || responsible.nombre_externo
    || responsible.usuario_nombre
    || (responsible.usuario_id ? `Cuenta institucional #${responsible.usuario_id}` : 'Responsable sin nombre');
}

function returnDetails(value) {
  if (!value) return null;
  if (typeof value === 'string') return { message: value, date: '', actor: '' };
  return {
    message: value.observaciones || value.motivo || value.comentario || value.detalle || '',
    date: value.created_at || value.fecha || value.devuelta_at || value.updated_at || '',
    actor: value.usuario_nombre || value.devuelto_por_nombre || value.actor_nombre || value.devuelto_por || '',
  };
}

export function ReviewStep({
  draft,
  missing,
  user,
  onWorkflow,
  onArchived,
  secretary,
  hasUnsavedChanges = false,
  references = {},
}) {
  const source = draft.legacy_source;
  const latestReturn = returnDetails(draft.ultima_devolucion);
  const modality = MODALITIES.find((item) => item.value === draft.modalidad)?.label
    || draft.modalidad
    || 'Pendiente';
  const classification = (references.classifications || []).find(
    (item) => String(item.id) === String(draft.clasificacion_id)
  );
  const tagLabels = (draft.etiqueta_detalles || []).map((tag) => tag.nombre).filter(Boolean);
  if (tagLabels.length === 0) {
    (draft.etiquetas || []).forEach((tagId) => {
      const tag = (references.tags || []).find((item) => String(item.id) === String(tagId));
      if (tag?.nombre) tagLabels.push(tag.nombre);
    });
  }
  const customValues = Object.entries(draft.campos_personalizados || {}).map(([key, value]) => {
    const definition = (references.customFields || []).find((item) => item.clave === key);
    const rendered = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);
    return [definition?.nombre || key, rendered];
  });
  const recurrenceRule = draft.recurrencia?.enabled
    ? buildRRule(draft.recurrencia) || draft.recurrencia.rrule || 'Configuración pendiente'
    : 'No recurrente';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={draft.estado_programacion} />
        <StatusBadge value={draft.estado_documentacion} kind="document" />
        {draft.legacy_import && <Badge tone="outline">Importación histórica</Badge>}
      </div>

      {draft.estado_documentacion === 'REQUIERE_CORRECCION' && latestReturn && (
        <section className="rounded-xl border-2 border-red-400 bg-red-50 p-4 shadow-sm" aria-labelledby="latest-return-title" role="alert">
          <h2 id="latest-return-title" className="text-lg font-bold text-red-950">Corrección solicitada por Secretaría</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-red-900">
            {latestReturn.message || 'Revise la devolución más reciente antes de reenviar la documentación.'}
          </p>
          {(latestReturn.actor || latestReturn.date) && (
            <p className="mt-3 text-xs font-semibold text-red-800">
              {[latestReturn.actor, latestReturn.date ? fmtDateTime(latestReturn.date) : ''].filter(Boolean).join(' · ')}
            </p>
          )}
        </section>
      )}

      {missing.length > 0 ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4" aria-labelledby="missing-title">
          <h2 id="missing-title" className="font-bold text-red-900">Aún faltan {missing.length} campos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-900">La documentación reúne los requisitos para enviarse.</div>
      )}

      <section className="rounded-xl border border-gray-200 p-4" aria-labelledby="review-programming-title">
        <h2 id="review-programming-title" className="font-bold text-igss-900">Programación</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="font-semibold text-gray-600">Título</dt><dd className="break-words">{draft.titulo || 'Pendiente'}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold text-gray-600">Objetivo</dt><dd className="whitespace-pre-wrap break-words">{draft.objetivo || 'Pendiente'}</dd></div>
          <div><dt className="font-semibold text-gray-600">Tipo</dt><dd>{draft.tipo || 'Pendiente'}</dd></div>
          <div><dt className="font-semibold text-gray-600">Modalidad</dt><dd>{modality}</dd></div>
          <div><dt className="font-semibold text-gray-600">Prioridad</dt><dd>{draft.prioridad || 'MEDIA'}</dd></div>
          <div><dt className="font-semibold text-gray-600">Clasificación</dt><dd>{classification?.nombre || classification?.clave || draft.clasificacion || 'Sin clasificación'}</dd></div>
          <div><dt className="font-semibold text-gray-600">Inicio</dt><dd>{localDateTimeLabel(draft.inicio_at) || 'Sin fecha'}</dd></div>
          <div><dt className="font-semibold text-gray-600">Finalización</dt><dd>{localDateTimeLabel(draft.fin_at) || 'Sin fecha'}</dd></div>
          <div><dt className="font-semibold text-gray-600">Unidad o lugar</dt><dd className="break-words">{draft.unidad_lugar || 'Pendiente'}</dd></div>
          <div><dt className="font-semibold text-gray-600">Organizador</dt><dd className="break-words">{draft.organizador || 'Pendiente'}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold text-gray-600">Recurrencia</dt><dd className="break-all">{recurrenceRule}{draft.serie_id || draft.series_id ? ` · Serie #${draft.serie_id || draft.series_id}` : ''}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold text-gray-600">Etiquetas</dt><dd className="break-words">{tagLabels.join(', ') || 'Sin etiquetas'}</dd></div>
          {customValues.map(([label, value]) => (
            <div key={label} className="sm:col-span-2"><dt className="font-semibold text-gray-600">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 p-4" aria-labelledby="review-participants-title">
        <h2 id="review-participants-title" className="font-bold text-igss-900">Participantes y asistencia</h2>
        {draft.participantes.filter((item) => item.nombre || item.nombre_externo || item.usuario_id).length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No hay participantes registrados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-200">
            {draft.participantes.filter((item) => item.nombre || item.nombre_externo || item.usuario_id).map((participant, index) => (
              <li key={participant.id || `${participant.usuario_id || participantName(participant)}-${index}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <strong className="block break-words text-sm text-gray-900">{participantName(participant)}</strong>
                    <span className="text-xs text-gray-600">{participant.funcion || participant.organizacion_externa || 'Sin función indicada'}</span>
                  </div>
                  <Badge tone={attendanceLabel(participant) === 'Asistió' ? 'green' : attendanceLabel(participant) === 'No asistió' ? 'red' : 'outline'}>
                    {attendanceLabel(participant)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 p-4" aria-labelledby="review-report-title">
        <h2 id="review-report-title" className="font-bold text-igss-900">Informe de la actividad</h2>
        <dl className="mt-3 space-y-4">
          {REPORT_FIELDS.map(([field, label]) => (
            <div key={field}>
              <dt className="text-sm font-semibold text-gray-600">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">{draft.informe?.[field] || 'Pendiente'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 p-4" aria-labelledby="review-agreements-title">
        <h2 id="review-agreements-title" className="font-bold text-igss-900">Acuerdos</h2>
        {draft.acuerdos.filter((agreement) => agreement.descripcion).length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No hay acuerdos completos registrados.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {draft.acuerdos.filter((agreement) => agreement.descripcion).map((agreement, index) => (
              <article key={agreement.id || `${agreement.descripcion}-${index}`} className="rounded-lg bg-gray-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words text-sm font-bold text-gray-900">{agreement.descripcion}</h3>
                  <Badge tone="outline">{agreement.estado || 'PENDIENTE'}</Badge>
                </div>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="font-semibold text-gray-600">Vencimiento</dt><dd>{localDateTimeLabel(agreement.vencimiento_at) || 'Pendiente'}</dd></div>
                  <div><dt className="font-semibold text-gray-600">Prioridad</dt><dd>{agreement.prioridad || 'MEDIA'}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-semibold text-gray-600">Responsables</dt><dd className="break-words">{(agreement.responsables || []).map(responsibleName).join(', ') || 'Pendiente'}</dd></div>
                  {agreement.evidencia_cumplimiento && <div className="sm:col-span-2"><dt className="font-semibold text-gray-600">Evidencia de cumplimiento</dt><dd className="whitespace-pre-wrap break-words">{agreement.evidencia_cumplimiento}</dd></div>}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 p-4" aria-labelledby="review-evidence-title">
        <h2 id="review-evidence-title" className="font-bold text-igss-900">Evidencias adjuntas</h2>
        {draft.evidencias.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No se adjuntaron archivos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-200">
            {draft.evidencias.map((evidence, index) => (
              <li key={evidence.id || `${evidence.nombre_original || evidence.nombre}-${index}`} className="min-w-0 py-3 first:pt-0 last:pb-0">
                <strong className="block break-all text-sm text-gray-900">{evidence.nombre_original || evidence.nombre || 'Archivo sin nombre'}</strong>
                <span className="text-xs text-gray-600">{formatBytes(evidence.tamano_bytes || evidence.tamano || 0)} · {evidence.estado || 'DISPONIBLE'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {draft.legacy_import && (
        <section className="rounded-xl border border-gray-300 bg-gray-50 p-4" aria-labelledby="legacy-source-title">
          <h2 id="legacy-source-title" className="font-bold text-igss-900">Trazabilidad de importación histórica</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-gray-600">Fecha original</dt>
              <dd>{draft.fecha_texto_original || 'Sin fecha en el archivo'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-600">Precisión conservada</dt>
              <dd>{DATE_PRECISION_LABELS[draft.precision_fecha] || draft.precision_fecha || 'Sin dato'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-600">Hoja y fila</dt>
              <dd>{source ? `${source.hoja}, fila ${source.fila_numero}` : `Referencia interna #${draft.legacy_source_row_id || '—'}`}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-600">Lote de importación</dt>
              <dd className="break-all">{source?.lote_uid || source?.lote_id || 'No disponible'}</dd>
            </div>
            {source?.archivo_sha256 && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-gray-600">SHA-256 del archivo fuente</dt>
                <dd className="break-all font-mono text-xs">{source.archivo_sha256}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {secretary && draft.estado_documentacion === 'ENVIADA' && (
        <aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          Como Secretaría de control documental puede devolver o completar el expediente, pero no alterar silenciosamente el relato enviado.
        </aside>
      )}

      {draft.id && (
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4" aria-labelledby="actions-title">
          <h2 id="actions-title" className="mb-3 font-bold text-gray-900">Acciones del flujo</h2>
          <WorkflowActions
            activity={draft}
            user={user}
            onChanged={onWorkflow}
            onArchived={onArchived}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        </section>
      )}

      <details className="rounded-xl border border-gray-200 bg-white p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-bold text-igss-900">Estados y criterios</summary>
        <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
          <div><strong>Programación</strong><ul className="mt-2 space-y-1">{Object.values(PROGRAM_STATUS_META).map((item) => <li key={item.label}>{item.label}</li>)}</ul></div>
          <div><strong>Documentación</strong><ul className="mt-2 space-y-1">{Object.values(DOCUMENT_STATUS_META).map((item) => <li key={item.label}>{item.label}</li>)}</ul></div>
        </div>
      </details>
    </div>
  );
}

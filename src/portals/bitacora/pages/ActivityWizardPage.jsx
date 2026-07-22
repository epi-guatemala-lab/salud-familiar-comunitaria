import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { hasBitacoraCapability, isBitacoraSecretary } from '../../../lib/permissions';
import { bitacoraApi, newIdempotencyKey } from '../api';
import {
  activityId,
  activityToDraft,
  allMissingFields,
  buildRRule,
  initialDraft,
  isNarrativeLocked,
  normalizePaginated,
  serializeActivity,
  serializeAgreement,
  serializeParticipants,
  serializeReport,
  validateEvidenceFiles,
} from '../model';
import { ErrorState, LoadingState } from '../components/AsyncState';
import StatusBadge from '../components/StatusBadge';
import {
  AgreementsStep,
  EvidenceStep,
  ParticipantsStep,
  ProgrammingStep,
  ReportStep,
  ReviewStep,
  StepNavigation,
  WIZARD_STEPS,
} from '../components/WizardSteps';

function unwrap(payload) {
  return payload?.actividad || payload?.item || payload || {};
}

function extractVersion(payload, fallback) {
  return unwrap(payload).version ?? payload?.version ?? fallback;
}

function validAgreement(agreement) {
  return Boolean(
    agreement.descripcion?.trim()
    && agreement.vencimiento_at
    && agreement.responsables?.some((responsible) => responsible.usuario_id || responsible.nombre?.trim() || responsible.nombre_externo?.trim())
  );
}

function agreementHasDraftContent(agreement) {
  if (agreement.id) return true;
  if (
    agreement.descripcion?.trim()
    || agreement.vencimiento_at
    || agreement.evidencia_cumplimiento?.trim()
  ) {
    return true;
  }
  return agreement.responsables?.some((responsible) => (
    responsible.usuario_id
    || responsible.nombre?.trim()
    || responsible.nombre_externo?.trim()
    || responsible.organizacion_externa?.trim()
  ));
}

export default function ActivityWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const [draft, setDraft] = useState(() => initialDraft());
  const [step, setStep] = useState(0);
  const [scope, setScope] = useState('single');
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [conflict, setConflict] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [references, setReferences] = useState({
    people: [],
    types: [],
    classifications: [],
    tags: [],
    customFields: [],
    peopleLoading: true,
    catalogsLoading: true,
    unavailable: false,
  });
  const [originalSchedule, setOriginalSchedule] = useState({ inicio_at: '', fin_at: '' });
  const [originalRecurrence, setOriginalRecurrence] = useState({ enabled: false, rrule: null });
  const createKeyRef = useRef(newIdempotencyKey('actividad'));
  const evidenceKeysRef = useRef(new Map());
  const archiveKeyRef = useRef(null);
  const peopleRequestRef = useRef(0);

  useEffect(() => {
    const requestedStep = Number(location.state?.wizardStep);
    if (Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep < WIZARD_STEPS.length) {
      setStep(requestedStep);
    }
  }, [location.key, location.state]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      bitacoraApi.listPeople({ limit: 50 }),
      bitacoraApi.listCatalogValues('tipo_actividad', { page: 1, limit: 500 }),
      bitacoraApi.listCatalogValues('clasificacion', { page: 1, limit: 500 }),
      bitacoraApi.getConfiguration(),
    ]).then(([peopleResult, typesResult, classificationsResult, configurationResult]) => {
      if (!active) return;
      setReferences({
        people: peopleResult.status === 'fulfilled'
          ? normalizePaginated(peopleResult.value).items
          : [],
        types: typesResult.status === 'fulfilled'
          ? normalizePaginated(typesResult.value).items
          : [],
        classifications: classificationsResult.status === 'fulfilled'
          ? normalizePaginated(classificationsResult.value).items
          : [],
        tags: configurationResult.status === 'fulfilled'
          ? configurationResult.value?.etiquetas || []
          : [],
        customFields: configurationResult.status === 'fulfilled'
          ? configurationResult.value?.campos_personalizados || []
          : [],
        peopleLoading: false,
        catalogsLoading: false,
        unavailable: [peopleResult, typesResult, classificationsResult, configurationResult]
          .some((result) => result.status === 'rejected'),
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const searchPeople = useCallback(async (query) => {
    const request = ++peopleRequestRef.current;
    setReferences((current) => ({ ...current, peopleLoading: true }));
    try {
      const response = await bitacoraApi.listPeople({ q: query || undefined, limit: 50 });
      if (request !== peopleRequestRef.current) return;
      setReferences((current) => ({
        ...current,
        people: normalizePaginated(response).items,
        peopleLoading: false,
      }));
    } catch {
      if (request !== peopleRequestRef.current) return;
      setReferences((current) => ({
        ...current,
        peopleLoading: false,
        unavailable: true,
      }));
    }
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = await bitacoraApi.getActivity(id);
      const activity = unwrap(payload);
      const [agreementsResult, evidenceResult] = await Promise.allSettled([
        activity.acuerdos ? Promise.resolve(activity.acuerdos) : bitacoraApi.listAgreements(id, { page: 1, limit: 200 }),
        activity.evidencias ? Promise.resolve(activity.evidencias) : bitacoraApi.listEvidence(id),
      ]);
      const agreements = agreementsResult.status === 'fulfilled'
        ? normalizePaginated(agreementsResult.value).items
        : activity.acuerdos;
      const evidencias = evidenceResult.status === 'fulfilled'
        ? normalizePaginated(evidenceResult.value).items
        : activity.evidencias;
      const normalized = activityToDraft({
        ...activity,
        id: activityId(activity) || Number(id),
        acuerdos: agreements,
        evidencias,
      });
      setDraft(normalized);
      setOriginalSchedule({ inicio_at: normalized.inicio_at, fin_at: normalized.fin_at });
      setOriginalRecurrence({
        enabled: Boolean(normalized.recurrencia?.enabled),
        rrule: buildRRule(normalized.recurrencia),
      });
      const persistedAt = activity.updated_at || activity.created_at;
      const persistedDate = persistedAt ? new Date(persistedAt) : null;
      setLastSaved(
        persistedDate && !Number.isNaN(persistedDate.getTime()) ? persistedDate : null
      );
      setLoadError(null);
      setConflict(false);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const missing = useMemo(
    () => allMissingFields(draft, references.customFields),
    [draft, references.customFields]
  );
  const secretary = isBitacoraSecretary(user);
  const canReport = hasBitacoraCapability(user, 'edit');
  const canProgram = hasBitacoraCapability(user, 'schedule')
    && (draft.estado_programacion === 'BORRADOR' || secretary);
  const canParticipants = hasBitacoraCapability(user, 'manageParticipants');
  const canAgreements = hasBitacoraCapability(user, 'agreements');
  const canEvidence = hasBitacoraCapability(user, 'evidence');
  const narrativeLocked = isNarrativeLocked(draft);
  const participantsLocked = draft.estado_documentacion === 'COMPLETA'
    || (draft.estado_documentacion === 'ENVIADA' && !secretary);
  const hasSeries = Boolean(draft.serie_id || draft.series_id);
  const scheduleChanged = Boolean(
    draft.id
    && (draft.inicio_at !== originalSchedule.inicio_at || draft.fin_at !== originalSchedule.fin_at)
  );
  const currentRule = buildRRule(draft.recurrencia);
  const recurrenceChanged = Boolean(
    draft.id
    && (
      Boolean(draft.recurrencia?.enabled) !== originalRecurrence.enabled
      || currentRule !== originalRecurrence.rrule
    )
  );
  const changeRequiresReason = Boolean(
    draft.estado_programacion !== 'BORRADOR' && (scheduleChanged || recurrenceChanged)
  );
  const stepDisabled = [
    !canProgram,
    !canParticipants || participantsLocked,
    !canReport || narrativeLocked,
    !canAgreements || narrativeLocked,
    !canEvidence || narrativeLocked,
    true,
  ][step];

  const mergeResponse = (response) => {
    const activity = unwrap(response);
    setDraft((current) => {
      const merged = activityToDraft({
        ...current,
        ...activity,
        id: activityId(activity) || current.id,
        version: extractVersion(response, current.version),
        participantes: activity.participantes || current.participantes,
        informe: activity.informe ? { ...current.informe, ...activity.informe } : current.informe,
        acuerdos: activity.acuerdos || current.acuerdos,
        evidencias: activity.evidencias || current.evidencias,
      });
      if (!activity.inicio_at && !activity.inicio_utc) merged.inicio_at = current.inicio_at;
      if (!activity.fin_at && !activity.fin_utc) merged.fin_at = current.fin_at;
      return merged;
    });
  };

  const createPayload = () => {
    const payload = serializeActivity(draft);
    const participants = serializeParticipants(draft.participantes);
    if (participants.length > 0) payload.participantes = participants;
    if (Object.values(draft.informe).some((value) => typeof value === 'string' && value.trim())) {
      payload.informe = serializeReport(draft.informe);
    }
    const agreements = draft.acuerdos.filter(validAgreement).map(serializeAgreement);
    if (agreements.length > 0) payload.acuerdos = agreements;
    return payload;
  };

  const saveAgreements = async (activityIdentifier) => {
    const incomplete = draft.acuerdos.filter(
      (agreement) => agreementHasDraftContent(agreement) && !validAgreement(agreement)
    );
    if (incomplete.length > 0) {
      toast.warning(
        'No se guardó el borrador: complete descripción, responsable y vencimiento de cada acuerdo iniciado.'
      );
      return false;
    }
    const validAgreements = draft.acuerdos.filter(validAgreement);
    if (validAgreements.length === 0) {
      toast.warning(
        'No se guardó el borrador: agregue al menos un acuerdo con descripción, responsable y vencimiento.'
      );
      return false;
    }

    const nextAgreements = [];
    for (const agreement of validAgreements) {
      const response = agreement.id
        ? await bitacoraApi.updateAgreement(agreement.id, serializeAgreement(agreement), agreement.version)
        : await bitacoraApi.createAgreement(
          activityIdentifier,
          serializeAgreement(agreement),
          agreement.client_key || newIdempotencyKey('acuerdo')
        );
      nextAgreements.push({ ...agreement, ...unwrap(response) });
    }
    const latest = unwrap(await bitacoraApi.getActivity(activityIdentifier));
    mergeResponse({
      ...latest,
      acuerdos: [
        ...(latest.acuerdos || nextAgreements),
        ...draft.acuerdos.filter((agreement) => !agreementHasDraftContent(agreement)),
      ],
    });
    return true;
  };

  const uploadPending = async (activityIdentifier) => {
    if (pendingFiles.length === 0) return;
    for (const file of pendingFiles) {
      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      const key = evidenceKeysRef.current.get(signature) || newIdempotencyKey('evidencia');
      evidenceKeysRef.current.set(signature, key);
      await bitacoraApi.uploadEvidence(activityIdentifier, file, {}, key);
      setPendingFiles((current) => current.filter((candidate) => candidate !== file));
      evidenceKeysRef.current.delete(signature);
    }
    const latest = await bitacoraApi.getActivity(activityIdentifier);
    mergeResponse(latest);
    setPendingFiles([]);
  };

  const saveCurrent = async ({ afterCreateStep = null } = {}) => {
    if (step === 5 || stepDisabled) return true;
    if (!draft.titulo.trim()) {
      setStep(0);
      toast.error('Escriba un título antes de crear el borrador en el servidor.');
      return false;
    }
    if (step === 0 && draft.recurrencia.enabled && !buildRRule(draft.recurrencia)) {
      toast.error('Complete el final de la recurrencia o escriba una RRULE válida con COUNT o UNTIL.');
      return false;
    }
    if (step === 0 && hasSeries && recurrenceChanged && scope === 'single') {
      toast.error('Cambiar la recurrencia requiere elegir “Esta y las futuras” o “Toda la serie”.');
      return false;
    }
    if (step === 0 && changeRequiresReason && (draft.motivo || '').trim().length < 3) {
      toast.error('Indique el motivo de la reprogramación o cambio de recurrencia.');
      return false;
    }
    setSaving(true);
    setConflict(false);
    try {
      let activityIdentifier = draft.id || id;
      if (!activityIdentifier) {
        const created = await bitacoraApi.createActivity(createPayload(), createKeyRef.current);
        const createdActivity = unwrap(created);
        activityIdentifier = activityId(createdActivity);
        mergeResponse(created);
        navigate(`/bitacora/actividades/${activityIdentifier}`, {
          replace: true,
          state: Number.isInteger(afterCreateStep) ? { wizardStep: afterCreateStep } : null,
        });
      } else if (step === 0) {
        const updated = await bitacoraApi.updateActivity(activityIdentifier, serializeActivity(draft), {
          version: draft.version,
          scope,
        });
        mergeResponse(updated);
        const returnedIdentifier = activityId(unwrap(updated));
        if (
          returnedIdentifier
          && String(returnedIdentifier) !== String(activityIdentifier)
        ) {
          navigate(`/bitacora/actividades/${returnedIdentifier}`, {
            replace: true,
            state: {
              wizardStep: Number.isInteger(afterCreateStep) ? afterCreateStep : step,
            },
          });
          activityIdentifier = returnedIdentifier;
        }
        setOriginalSchedule({ inicio_at: draft.inicio_at, fin_at: draft.fin_at });
        setOriginalRecurrence({
          enabled: Boolean(draft.recurrencia?.enabled),
          rrule: buildRRule(draft.recurrencia),
        });
        setDraft((current) => ({ ...current, motivo: '' }));
      } else if (step === 1) {
        mergeResponse(await bitacoraApi.saveParticipants(
          activityIdentifier,
          serializeParticipants(draft.participantes),
          draft.version
        ));
      } else if (step === 2) {
        mergeResponse(await bitacoraApi.saveReport(
          activityIdentifier,
          serializeReport(draft.informe),
          draft.version
        ));
      } else if (step === 3) {
        const saved = await saveAgreements(activityIdentifier);
        if (!saved) return false;
      } else if (step === 4) {
        await uploadPending(activityIdentifier);
      }
      setLastSaved(new Date());
      toast.success('Borrador guardado en el servidor.');
      return true;
    } catch (error) {
      if (error?.status === 409 || error?.code === 'VERSION_CONFLICT') {
        setConflict(true);
      } else {
        toast.error(error?.message || 'No se pudo guardar el borrador.');
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const nextStep = Math.min(WIZARD_STEPS.length - 1, step + 1);
    const saved = await saveCurrent({ afterCreateStep: nextStep });
    if (saved) setStep(nextStep);
  };

  const chooseFiles = (fileList) => {
    const existingBytes = draft.evidencias.reduce(
      (sum, evidence) => sum + Number(evidence.tamano_bytes || evidence.tamano || 0),
      pendingFiles.reduce((sum, file) => sum + file.size, 0)
    );
    const errors = validateEvidenceFiles(fileList, existingBytes);
    if (errors.length > 0) {
      errors.forEach((message) => toast.error(message));
      return;
    }
    setPendingFiles((current) => [...current, ...Array.from(fileList || [])]);
  };

  const downloadEvidence = async (evidence) => {
    try {
      const response = await bitacoraApi.downloadEvidence(evidence.id);
      const url = URL.createObjectURL(response.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = decodeURIComponent(response.filename || evidence.nombre_original || evidence.nombre || 'evidencia');
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(error?.message || 'No se pudo descargar la evidencia.');
    }
  };

  const replaceEvidence = async (evidence, file, reason, idempotencyKey) => {
    const errors = validateEvidenceFiles([file]);
    if (errors.length > 0) {
      errors.forEach((message) => toast.error(message));
      throw new Error(errors[0]);
    }
    try {
      await bitacoraApi.replaceEvidence(evidence.id, file, reason, idempotencyKey);
      await load();
      toast.success('La nueva versión quedó registrada; la anterior se conserva en auditoría.');
    } catch (error) {
      toast.error(error?.message || 'No se pudo sustituir la evidencia.');
      throw error;
    }
  };

  const archiveAgreement = async () => {
    setArchiving(true);
    try {
      await bitacoraApi.archiveAgreement(
        archiveTarget.id,
        archiveReason,
        archiveTarget.version,
        archiveKeyRef.current
      );
      setDraft((current) => ({
        ...current,
        acuerdos: current.acuerdos.filter((agreement) => agreement.id !== archiveTarget.id),
      }));
      setArchiveTarget(null);
      setArchiveReason('');
      await load();
      toast.success('Acuerdo archivado sin borrado físico.');
    } catch (error) {
      toast.error(error?.message || 'No se pudo archivar el acuerdo.');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) return <LoadingState label="Cargando actividad…" />;
  if (loadError) return <ErrorState error={loadError} onRetry={load} />;

  const workflowChanged = (response) => {
    const returnedIdentifier = activityId(unwrap(response));
    const currentIdentifier = draft.id || id;
    if (
      returnedIdentifier
      && String(returnedIdentifier) !== String(currentIdentifier)
    ) {
      navigate(`/bitacora/actividades/${returnedIdentifier}`, {
        replace: true,
        state: { wizardStep: 5 },
      });
      return;
    }
    load();
  };

  const renderStep = () => {
    if (step === 0) return <ProgrammingStep draft={draft} setDraft={setDraft} disabled={stepDisabled} scope={scope} onScope={setScope} hasSeries={hasSeries} requiresReason={changeRequiresReason} typeOptions={references.types} classificationOptions={references.classifications} tagOptions={references.tags} customFields={references.customFields} referencesLoading={references.catalogsLoading} />;
    if (step === 1) return <ParticipantsStep draft={draft} setDraft={setDraft} disabled={stepDisabled} people={references.people} peopleLoading={references.peopleLoading} onSearchPeople={searchPeople} />;
    if (step === 2) return <ReportStep draft={draft} setDraft={setDraft} disabled={stepDisabled} />;
    if (step === 3) return <AgreementsStep draft={draft} setDraft={setDraft} disabled={stepDisabled} onArchive={(agreement) => { archiveKeyRef.current = newIdempotencyKey('archivar'); setArchiveTarget(agreement); }} people={references.people} peopleLoading={references.peopleLoading} onSearchPeople={searchPeople} />;
    if (step === 4) return <EvidenceStep draft={draft} pendingFiles={pendingFiles} onFiles={chooseFiles} disabled={stepDisabled} onDownload={downloadEvidence} onReplace={replaceEvidence} />;
    return <ReviewStep draft={draft} missing={missing} user={user} secretary={secretary} onWorkflow={workflowChanged} />;
  };

  return (
    <div className="space-y-5 pb-40 sm:pb-28">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/bitacora/actividades" className="inline-flex min-h-11 items-center text-sm font-semibold text-igss-700 hover:underline">← Volver a actividades</Link>
          <h1 className="text-2xl font-bold text-igss-900">{draft.id ? draft.titulo || 'Actividad' : 'Nueva actividad'}</h1>
          {draft.id && <div className="mt-2 flex flex-wrap gap-2"><StatusBadge value={draft.estado_programacion} /><StatusBadge value={draft.estado_documentacion} kind="document" /></div>}
        </div>
        <div className="text-right text-xs text-gray-500" aria-live="polite">
          {lastSaved ? `Último guardado: ${lastSaved.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}` : 'Los borradores se guardan en el servidor'}
        </div>
      </div>

      <aside className="rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4 text-sm text-yellow-950" role="note">
        <strong>No ingrese nombres, números de afiliación, DPI ni otros identificadores de pacientes.</strong> Esta Bitácora no es un expediente clínico.
      </aside>

      {conflict && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4" role="alert">
          <div><strong className="text-red-900">Otra persona modificó esta actividad.</strong><p className="text-sm text-red-800">No se sobrescribieron sus cambios. Cargue la versión más reciente antes de continuar.</p></div>
          <Button variant="secondary" className="min-h-11" onClick={load}>Cargar versión reciente</Button>
        </div>
      )}

      {references.unavailable && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-950" role="status">
          No fue posible cargar una parte de los catálogos institucionales. Puede continuar con los datos disponibles y volver a intentar al recargar la actividad.
        </div>
      )}

      <StepNavigation current={step} onSelect={setStep} />

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="current-step-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <h2 id="current-step-title" className="text-xl font-bold text-igss-900">{step + 1}. {WIZARD_STEPS[step]}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${missing.length ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {missing.length ? `${missing.length} faltante${missing.length === 1 ? '' : 's'}` : 'Sin faltantes'}
          </span>
        </div>
        {stepDisabled && step < 5 && (
          <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            Esta sección está en modo de consulta por su permiso o por el estado documental actual.
          </p>
        )}
        {renderStep()}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 && <Button variant="secondary" className="min-h-11 self-start" disabled={saving} onClick={() => setStep((current) => current - 1)}>Anterior</Button>}
          <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
            {step < 5 && !stepDisabled && <Button variant="secondary" className="min-h-11" loading={saving} onClick={saveCurrent}>Guardar borrador</Button>}
            {step < 5 ? <Button className={`min-h-11 ${stepDisabled ? 'col-span-2' : ''}`} loading={saving} onClick={next}>{stepDisabled ? 'Continuar' : 'Guardar y continuar'}</Button> : <Button className="col-span-2 min-h-11" onClick={() => navigate('/bitacora/actividades')}>Finalizar</Button>}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(archiveTarget)}
        title="Archivar acuerdo"
        onClose={() => !archiving && setArchiveTarget(null)}
        footer={
          <>
            <Button variant="secondary" className="min-h-11" onClick={() => setArchiveTarget(null)} disabled={archiving}>Volver</Button>
            <Button variant="danger" className="min-h-11" onClick={archiveAgreement} loading={archiving} disabled={archiveReason.trim().length < 3}>Archivar</Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">El acuerdo dejará de estar activo, pero conservará su historial y auditoría.</p>
        <Textarea name="archive-reason" className="mt-4" label="Motivo" value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} required maxLength={1000} />
      </Modal>
    </div>
  );
}

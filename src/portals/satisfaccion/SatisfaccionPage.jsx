import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import UnidadSelect from '../../components/shared/UnidadSelect';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';

import ItemLikertCard from './ItemLikertCard';
import ProfesionalRow from './ProfesionalRow';
import { ITEMS_18, PROFESIONALES_6 } from './schema';

import { api } from '../../lib/api';
import { useFormState } from '../../hooks/useFormState';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useToast } from '../../contexts/ToastContext';
import { STORAGE_KEYS } from '../../config/constants';
import { safeGet, safeSet, safeRemove } from '../../lib/storage';
import { calcKpisLocal } from '../../lib/format';
import M from '../../config/messages';

function makeInitial(uuid) {
  return {
    uuid,
    unidad_id: null,
    unidad_nombre: '',
    unidad_departamento: '',
    numero_clinica: '',
    nombre_medico: '',
    ...Object.fromEntries(ITEMS_18.map((i) => [i.field, null])),
    ...Object.fromEntries(PROFESIONALES_6.map((p) => [p.field, null])),
    mejoras_sugeridas: '',
  };
}

export default function SatisfaccionPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { enqueue, isOnline } = useOfflineQueue();

  // UUID idempotente: persistido entre reloads para no duplicar envios.
  const [uuid] = useState(() => {
    const stored = safeGet(STORAGE_KEYS.ENCUESTA_UUID);
    if (stored && /^[0-9a-f-]{36}$/.test(stored)) return stored;
    const fresh = uuidv4();
    safeSet(STORAGE_KEYS.ENCUESTA_UUID, fresh);
    return fresh;
  });

  const initial = useMemo(() => makeInitial(uuid), [uuid]);
  const { formData, updateField, clearForm } = useFormState(STORAGE_KEYS.ENCUESTA_DRAFT, initial);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  // Asegurar uuid persistido en cada montado.
  useEffect(() => {
    safeSet(STORAGE_KEYS.ENCUESTA_UUID, uuid);
  }, [uuid]);

  // Progreso visual: % de items respondidos (sobre 18).
  const respondidos = ITEMS_18.filter((i) => formData[i.field] != null).length;
  const totalProgress = (respondidos / ITEMS_18.length) * 100;

  // KPI vivo solo informativo en footer.
  const kpiLocal = useMemo(() => {
    const items = ITEMS_18.map((i) => formData[i.field]);
    return calcKpisLocal(items);
  }, [formData]);

  const handleSelectUnidad = (u) => {
    updateField('unidad_id', u.id ?? null);
    updateField('unidad_nombre', u.nombre || '');
    updateField('unidad_departamento', u.departamento || '');
  };

  const validate = () => {
    const errs = {};
    if (!formData.unidad_nombre || formData.unidad_nombre.length < 2) {
      errs.unidad = M.validation.selectUnit;
    }
    ITEMS_18.forEach((i) => {
      if (formData[i.field] == null) errs[i.field] = M.validation.fieldRequired;
    });
    return errs;
  };

  const buildPayload = () => {
    // Asegurar ints en items 1..5 (no string).
    const payload = { ...formData };
    ITEMS_18.forEach((i) => {
      payload[i.field] = Number(payload[i.field]);
    });
    PROFESIONALES_6.forEach((p) => {
      payload[p.field] = payload[p.field] != null ? Number(payload[p.field]) : null;
    });
    if (!payload.numero_clinica) delete payload.numero_clinica;
    if (!payload.nombre_medico) delete payload.nombre_medico;
    if (!payload.mejoras_sugeridas) delete payload.mejoras_sugeridas;
    if (!payload.unidad_id) payload.unidad_id = null;
    if (!payload.unidad_departamento) payload.unidad_departamento = null;
    return payload;
  };

  const finishSuccess = (offlineQueued = false) => {
    clearForm();
    safeRemove(STORAGE_KEYS.ENCUESTA_UUID);
    navigate(`/satisfaccion/gracias${offlineQueued ? '?offline=1' : ''}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Scroll al primer error.
      const firstField = errs.unidad ? 'unidad-anchor' : Object.keys(errs)[0];
      const el = document.getElementById(firstField);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.warning('Por favor responda todos los ítems obligatorios.');
      return;
    }

    setSubmitting(true);
    setErrors({});
    const payload = buildPayload();

    try {
      if (!isOnline) {
        await enqueue('/api/encuesta', payload);
        toast.success('Encuesta guardada. Se enviará cuando vuelva la conexión.');
        finishSuccess(true);
        return;
      }
      await api.post('/api/encuesta', payload, { auth: false });
      toast.success('¡Gracias! Su encuesta fue enviada.');
      finishSuccess(false);
    } catch (err) {
      const status = err?.status ?? 0;
      // Errores de red o 5xx → encolar offline.
      if (status === 0 || status >= 500 || err?.networkError) {
        try {
          await enqueue('/api/encuesta', payload);
          toast.warning('Sin conexión. Se enviará automáticamente al recuperar internet.');
          finishSuccess(true);
          return;
        } catch (_) {
          /* fallthrough */
        }
      }
      // 4xx → mostrar error de validación.
      const msg = err?.message || 'Error al enviar la encuesta';
      setErrors({ _global: msg });
      if (err?.field) setErrors((prev) => ({ ...prev, [err.field]: msg }));
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-igss-50">
      <Header showSfycLogo portal="Encuesta de Satisfacción" />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-igss-800">{M.encuesta.title}</h1>
          <p className="text-sm text-gray-600">{M.encuesta.subtitle}</p>
          <p className="text-sm text-gray-700 mt-2">{M.encuesta.intro}</p>
        </div>

        {/* Progreso */}
        <div className="mb-4 bg-white rounded-lg p-3 shadow-sm">
          <ProgressBar
            value={respondidos}
            max={ITEMS_18.length}
            label={`Avance: ${respondidos}/${ITEMS_18.length} respuestas`}
          />
        </div>

        {!isOnline && (
          <div
            className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded-md text-sm"
            role="alert"
          >
            ⚠ {M.encuesta.offlineWarning}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Seccion 1: Unidad */}
          <section className="bg-white rounded-lg p-4 shadow" id="unidad-anchor">
            <UnidadSelect
              value={formData.unidad_id}
              onChange={handleSelectUnidad}
              error={errors.unidad}
            />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="numero_clinica"
                type="text"
                inputMode="text"
                placeholder={M.encuesta.numeroClinica}
                aria-label={M.encuesta.numeroClinica}
                value={formData.numero_clinica}
                maxLength={20}
                onChange={(e) => updateField('numero_clinica', e.target.value.toUpperCase())}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-igss-500"
              />
              <input
                name="nombre_medico"
                type="text"
                placeholder={M.encuesta.nombreMedico}
                aria-label={M.encuesta.nombreMedico}
                value={formData.nombre_medico}
                maxLength={200}
                onChange={(e) => updateField('nombre_medico', e.target.value.toUpperCase())}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-igss-500"
              />
            </div>
          </section>

          {/* Seccion 2: 18 items likert */}
          <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="font-semibold text-igss-700 mb-2">{M.encuesta.seccionAtencion}</h2>
            <p className="text-xs text-gray-600 mb-4">
              <span className="font-bold">Escala:</span>{' '}
              <span className="text-red-600">1=Necesita mejorar</span> ·{' '}
              <span className="text-orange-600">2=Aceptable</span> ·{' '}
              <span className="text-yellow-700">3=Bueno</span> ·{' '}
              <span className="text-blue-600">4=Muy bueno</span> ·{' '}
              <span className="text-green-700 font-bold">5=Excelente</span>
            </p>
            <div className="space-y-3">
              {ITEMS_18.map((item, idx) => (
                <ItemLikertCard
                  key={item.field}
                  id={item.field}
                  number={idx + 1}
                  text={item.text}
                  value={formData[item.field]}
                  onChange={(v) => updateField(item.field, v)}
                  error={errors[item.field]}
                />
              ))}
            </div>
          </section>

          {/* Seccion 3: 6 profesionales */}
          <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="font-semibold text-igss-700 mb-3">{M.encuesta.seccionProfesionales}</h2>
            <p className="text-xs text-gray-600 mb-3">
              Si no recibió atención de alguno de estos profesionales, marque «No aplica».
            </p>
            <div className="space-y-1">
              {PROFESIONALES_6.map((p) => (
                <ProfesionalRow
                  key={p.field}
                  label={p.label}
                  value={formData[p.field]}
                  onChange={(v) => updateField(p.field, v)}
                />
              ))}
            </div>
          </section>

          {/* Seccion 4: mejoras */}
          <section className="bg-white rounded-lg p-4 shadow">
            <Textarea
              name="mejoras_sugeridas"
              label={M.encuesta.seccionMejoras}
              value={formData.mejoras_sugeridas}
              onChange={(e) => updateField('mejoras_sugeridas', e.target.value)}
              maxLength={2000}
              placeholder={M.encuesta.placeholderMejoras}
              rows={4}
            />
          </section>

          {errors._global && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm" role="alert">
              {errors._global}
            </div>
          )}

          {/* Resumen / KPI vivo */}
          {respondidos === ITEMS_18.length && kpiLocal.promedio != null && (
            <div className="bg-igss-100 border border-igss-300 text-igss-900 p-3 rounded-md text-sm">
              ✓ Respondió todos los ítems. Promedio actual: <b>{kpiLocal.promedio.toFixed(2)}</b> / 5.
            </div>
          )}

          <div className="sticky bottom-2 z-10">
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              className="shadow-lg"
            >
              {submitting ? M.encuesta.btnEnviando : M.encuesta.btnEnviar}
            </Button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

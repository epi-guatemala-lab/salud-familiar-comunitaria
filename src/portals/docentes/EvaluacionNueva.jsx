import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import DateField from '../../components/ui/DateField';
import RadioGroup from '../../components/ui/RadioGroup';

const RUBRICAS = [
  {
    codigo: 'GENERICA',
    titulo: 'Genérica',
    icon: '📋',
    descripcion: 'Anual transversal',
    detalles: '6 dimensiones · Escala 1-4 ponderada',
  },
  {
    codigo: 'GYO',
    titulo: 'GYO',
    icon: '♀',
    descripcion: '4 meses rotación',
    detalles: '8 temas · Semáforo 2/3/4',
  },
  {
    codigo: 'PEDIATRIA',
    titulo: 'Pediatría',
    icon: '👶',
    descripcion: '4 meses rotación',
    detalles: '9 temas · Semáforo 2/3/4',
  },
];

const MODALIDADES = [
  { value: 'ORAL', label: 'Oral' },
  { value: 'ESCRITA', label: 'Escrita' },
  { value: 'MIXTA', label: 'Mixta' },
  { value: 'PRACTICA', label: 'Práctica' },
];

/**
 * EvaluacionNueva — wizard 3 pasos.
 * Step 1: Selección rúbrica (3 cards)
 * Step 2: Si GYO/PED → seleccionar tema (lista con preview de caso)
 * Step 3: Selector residente + fecha + modalidad
 *
 * Submit → POST /api/docente/evaluaciones (DRAFT) → /docentes/evaluaciones/:id
 */
export default function EvaluacionNueva() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const residentePreseleccionado = searchParams.get('residente_id');
  const rubricaPreseleccionada = searchParams.get('rubrica');

  const [step, setStep] = useState(1);
  const [rubricaCodigo, setRubricaCodigo] = useState(rubricaPreseleccionada || '');
  const [temaId, setTemaId] = useState(null);
  const [residenteId, setResidenteId] = useState(residentePreseleccionado || '');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalidad, setModalidad] = useState('ORAL');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Cargar catálogo rúbricas (con temas)
  const { data: rubricas, loading: loadingRubricas } = useApi('/api/docente/rubricas');
  // Cargar residentes
  const { data: residentesData, loading: loadingResidentes } = useApi(
    '/api/docente/residentes',
  );

  const rubricasArr = useMemo(
    () => (Array.isArray(rubricas) ? rubricas : rubricas?.data || []),
    [rubricas],
  );
  const residentes = useMemo(
    () => (Array.isArray(residentesData) ? residentesData : residentesData?.data || []),
    [residentesData],
  );

  const rubricaSeleccionada = useMemo(
    () => rubricasArr.find((r) => r.codigo === rubricaCodigo),
    [rubricasArr, rubricaCodigo],
  );

  const requiereTema = rubricaCodigo === 'GYO' || rubricaCodigo === 'PEDIATRIA';

  const stepValid = useMemo(() => {
    if (step === 1) return !!rubricaCodigo;
    if (step === 2) return !requiereTema || !!temaId;
    if (step === 3) return !!residenteId && !!fecha && !!modalidad;
    return false;
  }, [step, rubricaCodigo, requiereTema, temaId, residenteId, fecha, modalidad]);

  // Skip step 2 si genérica
  useEffect(() => {
    if (step === 2 && !requiereTema) setStep(3);
  }, [step, requiereTema]);

  const handleNext = () => {
    if (!stepValid) return;
    if (step === 1 && !requiereTema) setStep(3);
    else setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    if (step === 3 && !requiereTema) setStep(1);
    else setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!rubricaSeleccionada) return;
    setSubmitting(true);
    try {
      const payload = {
        rubrica_id: rubricaSeleccionada.id,
        tema_id: requiereTema ? Number(temaId) : null,
        residente_id: Number(residenteId),
        fecha_evaluacion: fecha,
        modalidad,
      };
      const res = await api.post('/api/docente/evaluaciones', payload);
      const newId = res?.id || res?.evaluacion?.id;
      if (!newId) throw new Error('Respuesta del servidor sin ID');
      navigate(`/docentes/evaluaciones/${newId}`);
    } catch (err) {
      setSubmitError(err?.message || 'No se pudo crear la evaluación');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/docentes/residentes"
            className="text-sm text-igss-700 hover:text-igss-900"
          >
            ← Volver
          </Link>
          <h1 className="text-2xl font-bold text-igss-900 mt-1">Nueva evaluación</h1>
        </div>
        <StepIndicator step={step} hasStep2={requiereTema} />
      </div>

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {submitError}
        </div>
      )}

      {step === 1 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Paso 1 · Seleccione la rúbrica
          </h2>
          {loadingRubricas ? (
            <div className="py-8 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {RUBRICAS.map((r) => {
                const disponible = rubricasArr.some((x) => x.codigo === r.codigo);
                const selected = rubricaCodigo === r.codigo;
                return (
                  <button
                    type="button"
                    key={r.codigo}
                    disabled={!disponible}
                    onClick={() => {
                      setRubricaCodigo(r.codigo);
                      setTemaId(null);
                    }}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-igss-700 bg-igss-50 shadow-igss'
                        : 'border-gray-200 bg-white hover:border-igss-300 hover:bg-igss-50'
                    } ${!disponible ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-3xl mb-2">{r.icon}</div>
                    <div className="font-bold text-igss-900">{r.titulo}</div>
                    <div className="text-xs text-gray-600 mt-1">{r.descripcion}</div>
                    <div className="text-xs text-gray-500 mt-2">{r.detalles}</div>
                    {!disponible && (
                      <div className="text-xs text-red-600 mt-2">No disponible</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {step === 2 && requiereTema && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Paso 2 · Seleccione el tema
          </h2>
          {!rubricaSeleccionada?.temas || rubricaSeleccionada.temas.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No hay temas configurados para esta rúbrica.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rubricaSeleccionada.temas.map((t) => {
                const selected = String(temaId) === String(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTemaId(t.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-igss-700 bg-igss-50 shadow-igss'
                        : 'border-gray-200 bg-white hover:border-igss-300 hover:bg-igss-50'
                    }`}
                  >
                    <div className="text-xs uppercase font-semibold text-igss-700">
                      Tema {t.numero ?? t.orden ?? '?'}
                    </div>
                    <div className="font-semibold text-gray-900 mt-1">
                      {t.titulo}
                    </div>
                    {t.caso_clinico_resumen && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                        {t.caso_clinico_resumen}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {step === 3 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Paso 3 · Seleccione residente y datos de la evaluación
          </h2>
          <div className="space-y-4 max-w-md">
            <Select
              label="Residente"
              required
              value={residenteId}
              onChange={(e) => setResidenteId(e.target.value)}
              disabled={loadingResidentes}
            >
              <option value="">— Seleccione —</option>
              {residentes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre_completo}
                </option>
              ))}
            </Select>

            <DateField
              label="Fecha de evaluación"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modalidad
              </label>
              <RadioGroup
                value={modalidad}
                onChange={setModalidad}
                options={MODALIDADES}
              />
            </div>

            {/* Resumen */}
            <div className="rounded-lg bg-igss-50 border border-igss-200 p-3 text-sm text-igss-900">
              <div className="font-semibold mb-1">Resumen</div>
              <div>
                Rúbrica: <strong>{rubricaSeleccionada?.titulo || rubricaCodigo}</strong>
              </div>
              {requiereTema && (
                <div>
                  Tema:{' '}
                  <strong>
                    {rubricaSeleccionada?.temas?.find(
                      (t) => String(t.id) === String(temaId),
                    )?.titulo || '—'}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={step === 1 || submitting}
        >
          ← Atrás
        </Button>
        {step < 3 ? (
          <Button onClick={handleNext} disabled={!stepValid}>
            Siguiente →
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!stepValid || submitting}>
            {submitting ? 'Creando...' : 'Iniciar llenado →'}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step, hasStep2 }) {
  const total = hasStep2 ? 3 : 2;
  const current = hasStep2 ? step : step === 3 ? 2 : step;
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-8 rounded-full ${
            i + 1 <= current ? 'bg-igss-700' : 'bg-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-gray-600 ml-1">
        Paso {current} de {total}
      </span>
    </div>
  );
}

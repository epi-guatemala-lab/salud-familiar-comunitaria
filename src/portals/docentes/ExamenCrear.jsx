import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Checkbox from '../../components/ui/Checkbox';
import RadioGroup from '../../components/ui/RadioGroup';

const MODOS_ANTI_CHEAT = [
  { id: 'ESTRICTO', label: 'Estricto (recomendado)' },
  { id: 'NORMAL', label: 'Normal' },
  { id: 'LAXO', label: 'Laxo (solo logging)' },
];

const ORIGENES = [
  { id: 'CERO', label: 'Crear desde cero (banco)' },
  { id: 'TEMA', label: 'Desde tema de rúbrica (auto-popular)' },
];

/**
 * ExamenCrear — wizard 4 pasos para crear un examen.
 * POST /api/docente/examenes
 */
export default function ExamenCrear() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [origen, setOrigen] = useState('CERO');
  const [rubricaIdSel, setRubricaIdSel] = useState('');
  const [temaIdSel, setTemaIdSel] = useState('');

  // Step 2
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaApertura, setFechaApertura] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [duracionMin, setDuracionMin] = useState(60);
  const [intentos, setIntentos] = useState(1);
  const [aprobacionPct, setAprobacionPct] = useState(70);

  // Step 3
  const [filtroTema, setFiltroTema] = useState('');
  const [filtroDificultad, setFiltroDificultad] = useState('');
  const [preguntasSeleccionadas, setPreguntasSeleccionadas] = useState(new Set());
  const [preguntasPorIntento, setPreguntasPorIntento] = useState(15);

  // Step 4
  const [modo, setModo] = useState('ESTRICTO');
  const [maxStrikes, setMaxStrikes] = useState(3);
  const [powDifficulty, setPowDifficulty] = useState(0);
  const [flagFullscreen, setFlagFullscreen] = useState(true);
  const [flagBloqueoCopiar, setFlagBloqueoCopiar] = useState(true);
  const [flagDevtools, setFlagDevtools] = useState(true);
  const [flagBlur, setFlagBlur] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Datos
  const { data: rubricas } = useApi('/api/docente/rubricas');
  const rubricasArr = Array.isArray(rubricas) ? rubricas : rubricas?.data || [];
  const rubricaSel = rubricasArr.find((r) => String(r.id) === String(rubricaIdSel));
  const temasArr = rubricaSel?.temas || [];

  // Pool de banco filtrado
  const filtrosQs = new URLSearchParams();
  if (filtroTema) filtrosQs.set('tema_id', filtroTema);
  if (filtroDificultad) filtrosQs.set('dificultad', filtroDificultad);
  filtrosQs.set('limit', '200');
  const { data: preguntasData, loading: loadingPreguntas } = useApi(
    `/api/docente/preguntas?${filtrosQs.toString()}`,
    [filtroTema, filtroDificultad],
  );
  const preguntasArr = useMemo(() => {
    if (!preguntasData) return [];
    return Array.isArray(preguntasData) ? preguntasData : preguntasData.data || [];
  }, [preguntasData]);

  // Auto-popular preguntas si origen=TEMA y temaId se elige
  useEffect(() => {
    if (origen === 'TEMA' && temaIdSel && preguntasArr.length > 0) {
      const ids = preguntasArr
        .filter((p) => String(p.tema_id) === String(temaIdSel))
        .map((p) => p.id);
      setPreguntasSeleccionadas(new Set(ids));
    }
  }, [origen, temaIdSel, preguntasArr]);

  const togglePregunta = (id) => {
    setPreguntasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stepValid = useMemo(() => {
    if (step === 1) return origen === 'CERO' || (rubricaIdSel && temaIdSel);
    if (step === 2) {
      return (
        titulo.trim().length >= 3 &&
        fechaApertura &&
        fechaCierre &&
        new Date(fechaCierre) > new Date(fechaApertura) &&
        Number(duracionMin) > 0 &&
        Number(intentos) > 0 &&
        Number(aprobacionPct) >= 0 &&
        Number(aprobacionPct) <= 100
      );
    }
    if (step === 3) {
      return (
        preguntasSeleccionadas.size > 0 &&
        Number(preguntasPorIntento) > 0 &&
        Number(preguntasPorIntento) <= preguntasSeleccionadas.size
      );
    }
    if (step === 4) return true;
    return false;
  }, [
    step,
    origen,
    rubricaIdSel,
    temaIdSel,
    titulo,
    fechaApertura,
    fechaCierre,
    duracionMin,
    intentos,
    aprobacionPct,
    preguntasSeleccionadas,
    preguntasPorIntento,
  ]);

  const handleNext = () => {
    if (!stepValid) return;
    setStep((s) => Math.min(s + 1, 4));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (estadoFinal = 'BORRADOR') => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        rubrica_id: rubricaIdSel ? Number(rubricaIdSel) : null,
        tema_id: temaIdSel ? Number(temaIdSel) : null,
        fecha_apertura: fechaApertura,
        fecha_cierre: fechaCierre,
        duracion_minutos: Number(duracionMin),
        intentos_permitidos: Number(intentos),
        aprobacion_pct: Number(aprobacionPct),
        preguntas_ids: Array.from(preguntasSeleccionadas),
        preguntas_por_intento: Number(preguntasPorIntento),
        anti_cheat: {
          modo,
          max_strikes: Number(maxStrikes),
          pow_difficulty: Number(powDifficulty) || 0,
          fullscreen_obligatorio: flagFullscreen,
          bloqueo_copiar_pegar: flagBloqueoCopiar,
          detectar_devtools: flagDevtools,
          detectar_blur: flagBlur,
        },
        estado: estadoFinal,
      };
      const res = await api.post('/api/docente/examenes', payload);
      const id = res?.id || res?.examen?.id;
      navigate(id ? `/docentes/examenes/${id}/intentos` : '/docentes/examenes');
    } catch (err) {
      setSubmitError(err.message || 'No se pudo crear el examen');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/docentes/examenes"
            className="text-sm text-igss-700 hover:text-igss-900"
          >
            ← Volver
          </Link>
          <h1 className="text-2xl font-bold text-igss-900 mt-1">Crear examen</h1>
        </div>
        <div className="text-xs text-gray-600">Paso {step} de 4</div>
      </div>

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {submitError}
        </div>
      )}

      {step === 1 && (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Paso 1 · Origen del examen
          </h2>
          <RadioGroup value={origen} onChange={setOrigen} options={ORIGENES} />
          {origen === 'TEMA' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Rúbrica"
                value={rubricaIdSel}
                onChange={(e) => {
                  setRubricaIdSel(e.target.value);
                  setTemaIdSel('');
                }}
              >
                <option value="">— Seleccione —</option>
                {rubricasArr.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titulo || r.codigo}
                  </option>
                ))}
              </Select>
              <Select
                label="Tema"
                value={temaIdSel}
                onChange={(e) => setTemaIdSel(e.target.value)}
                disabled={!rubricaIdSel || temasArr.length === 0}
              >
                <option value="">— Seleccione —</option>
                {temasArr.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.numero ? `T${t.numero}: ${t.titulo}` : t.titulo}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Paso 2 · Información básica
          </h2>
          <Input
            label="Título"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Quiz Tema 3 — GYO"
          />
          <Input
            label="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Fecha y hora apertura"
              type="datetime-local"
              required
              value={fechaApertura}
              onChange={(e) => setFechaApertura(e.target.value)}
            />
            <Input
              label="Fecha y hora cierre"
              type="datetime-local"
              required
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Duración (min)"
              type="number"
              min={5}
              max={600}
              value={duracionMin}
              onChange={(e) => setDuracionMin(e.target.value)}
            />
            <Input
              label="Intentos permitidos"
              type="number"
              min={1}
              max={10}
              value={intentos}
              onChange={(e) => setIntentos(e.target.value)}
            />
            <Input
              label="Aprobación %"
              type="number"
              min={0}
              max={100}
              value={aprobacionPct}
              onChange={(e) => setAprobacionPct(e.target.value)}
            />
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Paso 3 · Pool de preguntas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Tema"
              value={filtroTema}
              onChange={(e) => setFiltroTema(e.target.value)}
            >
              <option value="">Todos</option>
              {temasArr.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
            </Select>
            <Select
              label="Dificultad"
              value={filtroDificultad}
              onChange={(e) => setFiltroDificultad(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </Select>
            <Input
              label="Preguntas por intento"
              type="number"
              min={1}
              max={Math.max(preguntasSeleccionadas.size, 1)}
              value={preguntasPorIntento}
              onChange={(e) => setPreguntasPorIntento(e.target.value)}
            />
          </div>

          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto divide-y divide-gray-100">
            {loadingPreguntas ? (
              <div className="p-8 flex justify-center">
                <Spinner />
              </div>
            ) : preguntasArr.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 italic">
                No hay preguntas en el banco con esos filtros.{' '}
                <Link
                  to="/docentes/preguntas"
                  className="text-igss-700 underline"
                >
                  Crear preguntas
                </Link>
                .
              </p>
            ) : (
              preguntasArr.map((q) => (
                <label
                  key={q.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={preguntasSeleccionadas.has(q.id)}
                    onChange={() => togglePregunta(q.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      <strong className="text-igss-700">Q{q.id}:</strong>{' '}
                      {q.enunciado}
                    </p>
                    <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                      <span>{q.tipo}</span>
                      {q.dificultad && <span>· {q.dificultad}</span>}
                      {q.tema_titulo && <span>· {q.tema_titulo}</span>}
                      {q.puntaje && <span>· {q.puntaje} pts</span>}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-gray-600">
            Pool: <strong>{preguntasSeleccionadas.size}</strong> preguntas
            seleccionadas · {preguntasPorIntento} por intento
          </p>
        </Card>
      )}

      {step === 4 && (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Paso 4 · Configuración anti-trampa
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modo
            </label>
            <RadioGroup value={modo} onChange={setModo} options={MODOS_ANTI_CHEAT} />
          </div>
          <div className="space-y-2">
            <Checkbox
              label="Fullscreen obligatorio"
              checked={flagFullscreen}
              onChange={(e) => setFlagFullscreen(e.target.checked)}
            />
            <Checkbox
              label="Bloqueo copy/paste"
              checked={flagBloqueoCopiar}
              onChange={(e) => setFlagBloqueoCopiar(e.target.checked)}
            />
            <Checkbox
              label="Detectar DevTools"
              checked={flagDevtools}
              onChange={(e) => setFlagDevtools(e.target.checked)}
            />
            <Checkbox
              label="Detectar pérdida de foco (blur)"
              checked={flagBlur}
              onChange={(e) => setFlagBlur(e.target.checked)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Max strikes"
              type="number"
              min={1}
              max={10}
              value={maxStrikes}
              onChange={(e) => setMaxStrikes(e.target.value)}
            />
            <Input
              label="PoW dificultad (0=off)"
              type="number"
              min={0}
              max={6}
              value={powDifficulty}
              onChange={(e) => setPowDifficulty(e.target.value)}
            />
          </div>
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="secondary" onClick={handleBack} disabled={step === 1 || submitting}>
          ← Atrás
        </Button>
        <div className="flex gap-2">
          {step < 4 ? (
            <Button onClick={handleNext} disabled={!stepValid}>
              Siguiente →
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => handleSubmit('BORRADOR')}
                disabled={submitting}
              >
                Guardar borrador
              </Button>
              <Button
                onClick={() => handleSubmit('PROGRAMADO')}
                disabled={submitting}
              >
                {submitting ? 'Creando...' : 'Programar examen →'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

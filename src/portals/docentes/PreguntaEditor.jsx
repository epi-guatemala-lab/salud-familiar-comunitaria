import { useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import Checkbox from '../../components/ui/Checkbox';

const TIPOS = [
  { value: 'MCQ', label: 'Opción única (radio)' },
  { value: 'MULTIPLE', label: 'Opción múltiple (checkbox)' },
  { value: 'ABIERTA', label: 'Respuesta abierta' },
  { value: 'VF', label: 'Verdadero / Falso' },
  { value: 'ORDENAR', label: 'Ordenar elementos' },
];

const DIFICULTADES = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
];

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function letraFor(idx) {
  return LETRAS[idx] || `${idx + 1}`;
}

function blankOption(idx) {
  return { letra: letraFor(idx), texto: '', correcta: false };
}

/**
 * PreguntaEditor — formulario para crear/editar una pregunta del banco.
 *
 * Props:
 *   pregunta?: objeto existente (modo edición)
 *   onClose: () => void
 *   onSaved: (pregunta) => void
 *   temas?: lista de temas para asociar
 */
export default function PreguntaEditor({ pregunta = null, onClose, onSaved, temas = [] }) {
  const toast = useToast();
  const isEdit = !!pregunta;

  const [tipo, setTipo] = useState(pregunta?.tipo || 'MCQ');
  const [enunciado, setEnunciado] = useState(pregunta?.enunciado || '');
  const [imagenUrl, setImagenUrl] = useState(pregunta?.imagen_url || '');
  const [puntaje, setPuntaje] = useState(pregunta?.puntaje ?? 1);
  const [retroalimentacion, setRetroalimentacion] = useState(
    pregunta?.retroalimentacion || ''
  );
  const [dificultad, setDificultad] = useState(pregunta?.dificultad || 'MEDIA');
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(pregunta?.tags) ? pregunta.tags.join(', ') : pregunta?.tags || ''
  );
  const [temaId, setTemaId] = useState(pregunta?.tema_id || '');
  const [rubricaId, setRubricaId] = useState(pregunta?.rubrica_id || '');

  const [opciones, setOpciones] = useState(() => {
    if (Array.isArray(pregunta?.opciones) && pregunta.opciones.length > 0) {
      return pregunta.opciones.map((o, i) => ({
        letra: o.letra || letraFor(i),
        texto: o.texto || '',
        correcta: !!o.correcta,
      }));
    }
    return [blankOption(0), blankOption(1), blankOption(2), blankOption(3)];
  });

  const [vfRespuesta, setVfRespuesta] = useState(
    pregunta?.respuesta_vf === true ? 'V' : pregunta?.respuesta_vf === false ? 'F' : 'V'
  );

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const requiereOpciones = tipo === 'MCQ' || tipo === 'MULTIPLE' || tipo === 'ORDENAR';

  // Para MCQ: solo una correcta
  const handleMarcarCorrecta = (idx, checked) => {
    setOpciones((prev) =>
      prev.map((o, i) => {
        if (tipo === 'MCQ') {
          return { ...o, correcta: i === idx ? checked : false };
        }
        return i === idx ? { ...o, correcta: checked } : o;
      })
    );
  };

  const updateOpcionTexto = (idx, txt) => {
    setOpciones((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, texto: txt } : o))
    );
  };

  const addOpcion = () => {
    setOpciones((prev) => [...prev, blankOption(prev.length)]);
  };

  const removeOpcion = (idx) => {
    setOpciones((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((o, i) => ({ ...o, letra: letraFor(i) }))
    );
  };

  const validate = () => {
    const errs = {};
    if (!enunciado || enunciado.trim().length < 10) {
      errs.enunciado = 'El enunciado debe tener al menos 10 caracteres';
    } else if (enunciado.length > 2000) {
      errs.enunciado = 'Máximo 2000 caracteres';
    }
    const p = Number(puntaje);
    if (Number.isNaN(p) || p < 0.1 || p > 100) {
      errs.puntaje = 'Puntaje entre 0.1 y 100';
    }
    if (requiereOpciones) {
      const llenas = opciones.filter((o) => (o.texto || '').trim().length > 0);
      if (llenas.length < 2) {
        errs.opciones = 'Debe haber al menos 2 opciones con texto';
      } else if (tipo === 'MCQ') {
        const correctas = llenas.filter((o) => o.correcta).length;
        if (correctas !== 1) {
          errs.opciones = 'En opción única debe marcar exactamente 1 correcta';
        }
      } else if (tipo === 'MULTIPLE') {
        const correctas = llenas.filter((o) => o.correcta).length;
        if (correctas < 1) {
          errs.opciones = 'En opción múltiple debe marcar al menos 1 correcta';
        }
      }
    }
    return errs;
  };

  const buildPayload = () => {
    const payload = {
      tipo,
      enunciado: enunciado.trim(),
      imagen_url: imagenUrl.trim() || null,
      puntaje: Number(puntaje),
      retroalimentacion: retroalimentacion.trim() || null,
      dificultad,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      tema_id: temaId || null,
      rubrica_id: rubricaId || null,
    };
    if (requiereOpciones) {
      payload.opciones = opciones
        .filter((o) => (o.texto || '').trim().length > 0)
        .map((o) => ({
          letra: o.letra,
          texto: o.texto.trim(),
          correcta: !!o.correcta,
        }));
    }
    if (tipo === 'VF') {
      payload.respuesta_vf = vfRespuesta === 'V';
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.warning('Revise los campos marcados');
      return;
    }
    setSubmitting(true);
    setErrors({});
    const payload = buildPayload();
    try {
      let saved;
      if (isEdit) {
        saved = await api.put(`/api/docente/preguntas/${pregunta.id}`, payload);
      } else {
        saved = await api.post('/api/docente/preguntas', payload);
      }
      onSaved?.(saved);
    } catch (err) {
      toast.error(err?.message || 'Error al guardar pregunta');
      if (err.field) setErrors({ [err.field]: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Tipo de pregunta"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          required
        >
          {TIPOS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          label="Dificultad"
          value={dificultad}
          onChange={(e) => setDificultad(e.target.value)}
        >
          {DIFICULTADES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <Textarea
        label="Enunciado"
        name="enunciado"
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
        rows={4}
        maxLength={2000}
        required
        error={errors.enunciado}
      />

      <Input
        label="Imagen URL (opcional)"
        name="imagen_url"
        type="url"
        value={imagenUrl}
        onChange={(e) => setImagenUrl(e.target.value)}
        placeholder="https://..."
      />

      {/* Opciones MCQ / MULTIPLE / ORDENAR */}
      {requiereOpciones && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Opciones {tipo === 'MCQ' && '(marque 1 correcta)'}
              {tipo === 'MULTIPLE' && '(marque las correctas)'}
            </label>
            <button
              type="button"
              onClick={addOpcion}
              className="text-xs font-medium text-igss-700 hover:text-igss-900"
            >
              + Agregar opción
            </button>
          </div>
          <div className="space-y-2">
            {opciones.map((op, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-igss-800 w-6">
                  {op.letra}
                </span>
                <input
                  type="text"
                  value={op.texto}
                  onChange={(e) => updateOpcionTexto(idx, e.target.value)}
                  placeholder={`Texto opción ${op.letra}`}
                  className="flex-1 border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-igss-500"
                />
                {tipo !== 'ORDENAR' && (
                  <label className="flex items-center gap-1 text-xs text-gray-700 whitespace-nowrap">
                    <input
                      type={tipo === 'MCQ' ? 'radio' : 'checkbox'}
                      name={tipo === 'MCQ' ? 'correcta' : `correcta-${idx}`}
                      checked={!!op.correcta}
                      onChange={(e) => handleMarcarCorrecta(idx, e.target.checked)}
                    />
                    Correcta
                  </label>
                )}
                {opciones.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOpcion(idx)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    aria-label="Eliminar opción"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.opciones && (
            <p className="mt-2 text-xs text-red-600">{errors.opciones}</p>
          )}
        </div>
      )}

      {tipo === 'VF' && (
        <Select
          label="Respuesta correcta"
          value={vfRespuesta}
          onChange={(e) => setVfRespuesta(e.target.value)}
        >
          <option value="V">Verdadero</option>
          <option value="F">Falso</option>
        </Select>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Puntaje"
          name="puntaje"
          type="number"
          step="0.1"
          min="0.1"
          max="100"
          value={puntaje}
          onChange={(e) => setPuntaje(e.target.value)}
          required
          error={errors.puntaje}
        />
        <Input
          label="Tags (separados por comas)"
          name="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="anatomía, cardio, urgencia"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Tema (opcional)"
          value={temaId}
          onChange={(e) => setTemaId(e.target.value)}
        >
          <option value="">— Sin tema —</option>
          {temas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.titulo || t.codigo}
            </option>
          ))}
        </Select>
        <Input
          label="Rúbrica ID (opcional)"
          name="rubrica_id"
          value={rubricaId}
          onChange={(e) => setRubricaId(e.target.value)}
          placeholder="ej. GENERICA, GYO_..."
        />
      </div>

      <Textarea
        label="Retroalimentación (mostrada al estudiante post-envío)"
        name="retroalimentacion"
        value={retroalimentacion}
        onChange={(e) => setRetroalimentacion(e.target.value)}
        rows={3}
        maxLength={1000}
      />

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? 'Guardar cambios' : 'Crear pregunta'}
        </Button>
      </div>
    </form>
  );
}

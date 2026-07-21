import { useEffect, useState } from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import {
  ACTIVITY_TYPES,
  DOCUMENT_STATUS_META,
  normalizePaginated,
  PROGRAM_STATUS_META,
} from '../model';
import { bitacoraApi } from '../api';

export const EMPTY_FILTERS = {
  q: '',
  unidad: '',
  tipo: '',
  clasificacion: '',
  participante: '',
  etiqueta: '',
  campo_clave: '',
  campo_valor: '',
  estado_programacion: '',
  estado_documentacion: '',
  fecha_desde: '',
  fecha_hasta: '',
  completitud: '',
};

export default function ActivityFilters({ value, onChange, onReset }) {
  const [references, setReferences] = useState({
    types: [],
    classifications: [],
    tags: [],
    customFields: [],
  });

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      bitacoraApi.listCatalogValues('tipo_actividad', { page: 1, limit: 500 }),
      bitacoraApi.listCatalogValues('clasificacion', { page: 1, limit: 500 }),
      bitacoraApi.getConfiguration(),
    ]).then(([types, classifications, configuration]) => {
      if (!active) return;
      setReferences({
        types: types.status === 'fulfilled' ? normalizePaginated(types.value).items : [],
        classifications: classifications.status === 'fulfilled'
          ? normalizePaginated(classifications.value).items
          : [],
        tags: configuration.status === 'fulfilled' ? configuration.value?.etiquetas || [] : [],
        customFields: configuration.status === 'fulfilled'
          ? (configuration.value?.campos_personalizados || []).filter(
            (field) => field.filtrable !== false
          )
          : [],
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const set = (field) => (event) => onChange({ ...value, [field]: event.target.value });
  const selectedCustomField = references.customFields.find(
    (field) => field.clave === value.campo_clave
  );
  const customValueControl = () => {
    if (!selectedCustomField) return null;
    const props = {
      name: 'custom-field-value',
      label: `Valor: ${selectedCustomField.nombre}`,
      value: value.campo_valor,
      onChange: set('campo_valor'),
    };
    if (selectedCustomField.tipo === 'BOOLEAN') {
      return (
        <Select {...props}>
          <option value="">Cualquiera</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </Select>
      );
    }
    if (selectedCustomField.tipo === 'SELECT') {
      return (
        <Select {...props}>
          <option value="">Cualquiera</option>
          {(selectedCustomField.opciones || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
      );
    }
    return (
      <Input
        {...props}
        type={selectedCustomField.tipo === 'NUMBER'
          ? 'number'
          : selectedCustomField.tipo === 'DATE' ? 'date' : 'text'}
        step={selectedCustomField.tipo === 'NUMBER' ? 'any' : undefined}
      />
    );
  };
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="filters-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="filters-title" className="font-bold text-igss-900">Filtros</h2>
        <Button variant="ghost" size="sm" className="min-h-11" onClick={onReset}>
          Limpiar
        </Button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          name="search"
          label="Buscar"
          placeholder="Título, objetivo o texto"
          value={value.q}
          onChange={set('q')}
          className="sm:col-span-2"
        />
        <Input name="unit" label="Unidad o lugar" value={value.unidad} onChange={set('unidad')} />
        <Select name="type" label="Tipo" value={value.tipo} onChange={set('tipo')}>
          <option value="">Todos</option>
          {references.types.length > 0
            ? references.types.map((type) => <option key={type.id} value={type.clave}>{type.nombre}</option>)
            : ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </Select>
        {references.classifications.length > 0 ? (
          <Select name="classification" label="Clasificación" value={value.clasificacion} onChange={set('clasificacion')}>
            <option value="">Todas</option>
            {references.classifications.map((classification) => (
              <option key={classification.id} value={classification.clave}>{classification.nombre}</option>
            ))}
          </Select>
        ) : (
          <Input name="classification" label="Clasificación" value={value.clasificacion} onChange={set('clasificacion')} />
        )}
        <Input
          name="participant"
          label="Participante"
          value={value.participante}
          onChange={set('participante')}
        />
        {references.tags.length > 0 && (
          <Select name="tag" label="Etiqueta" value={value.etiqueta} onChange={set('etiqueta')}>
            <option value="">Todas</option>
            {references.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.nombre}</option>)}
          </Select>
        )}
        {references.customFields.length > 0 && (
          <Select
            name="custom-field"
            label="Campo institucional"
            value={value.campo_clave}
            onChange={(event) => onChange({
              ...value,
              campo_clave: event.target.value,
              campo_valor: '',
            })}
          >
            <option value="">Todos</option>
            {references.customFields.map((field) => (
              <option key={field.clave} value={field.clave}>{field.nombre}</option>
            ))}
          </Select>
        )}
        {customValueControl()}
        <Select
          name="program-status"
          label="Programación"
          value={value.estado_programacion}
          onChange={set('estado_programacion')}
        >
          <option value="">Todos</option>
          {Object.entries(PROGRAM_STATUS_META).map(([key, item]) => (
            <option key={key} value={key}>{item.label}</option>
          ))}
        </Select>
        <Select
          name="document-status"
          label="Documentación"
          value={value.estado_documentacion}
          onChange={set('estado_documentacion')}
        >
          <option value="">Todos</option>
          {Object.entries(DOCUMENT_STATUS_META).map(([key, item]) => (
            <option key={key} value={key}>{item.label}</option>
          ))}
        </Select>
        <Input name="from" type="date" label="Desde" value={value.fecha_desde} onChange={set('fecha_desde')} />
        <Input name="to" type="date" label="Hasta" value={value.fecha_hasta} onChange={set('fecha_hasta')} />
        <Select name="completeness" label="Completitud" value={value.completitud} onChange={set('completitud')}>
          <option value="">Todas</option>
          <option value="completa">Completa</option>
          <option value="incompleta">Con faltantes</option>
        </Select>
      </div>
    </section>
  );
}

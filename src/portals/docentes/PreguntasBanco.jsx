import { useMemo, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';

import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { STORAGE_KEYS } from '../../config/constants';
import Button from '../../components/ui/Button';

import PreguntaEditor from './PreguntaEditor';

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'MCQ', label: 'Opción única' },
  { value: 'MULTIPLE', label: 'Opción múltiple' },
  { value: 'ABIERTA', label: 'Abierta' },
  { value: 'VF', label: 'Verdadero/Falso' },
  { value: 'ORDENAR', label: 'Ordenar' },
];

const DIFICULTADES = [
  { value: '', label: 'Todas' },
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
];

/**
 * PreguntasBanco — CRUD del banco de preguntas del docente.
 * GET /api/docente/preguntas?tipo=MCQ&dificultad=ALTA&q=...
 */
export default function PreguntasBanco() {
  const toast = useToast();
  const fileRef = useRef(null);

  const [tipo, setTipo] = useState('');
  const [dificultad, setDificultad] = useState('');
  const [tema, setTema] = useState('');
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState(null); // null | 'new' | preguntaObj
  const [importing, setImporting] = useState(false);

  // Lista de temas (para el select). Si no hay endpoint dedicado, dejamos vacío.
  const { data: temasData } = useApi('/api/docente/temas');
  const temas = useMemo(() => {
    const arr = Array.isArray(temasData) ? temasData : temasData?.data || [];
    return arr;
  }, [temasData]);

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (dificultad) params.set('dificultad', dificultad);
    if (tema) params.set('tema_id', tema);
    if (search.trim()) params.set('q', search.trim());
    const qs = params.toString();
    return qs ? `/api/docente/preguntas?${qs}` : '/api/docente/preguntas';
  }, [tipo, dificultad, tema, search]);

  const { data, loading, error, refetch } = useApi(path, [path]);
  const items = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.data || [];
  }, [data]);

  const handleSaved = () => {
    setEditing(null);
    refetch();
    toast.success('Pregunta guardada');
  };

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // TODO: backend endpoint POST /api/docente/preguntas/import (CSV con encabezado tipo,enunciado,opciones,...)
      const url = '/api/docente/preguntas/import';
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const res = await fetch(
        (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '') + url,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Error ${res.status}: ${txt || 'no se pudo importar'}`);
      }
      toast.success('Importación completada');
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Error al importar CSV');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-igss-900">Banco de preguntas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Preguntas reutilizables para sus exámenes y quizzes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileRef}
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleImportClick}
            loading={importing}
          >
            Importar CSV
          </Button>
          <Button type="button" onClick={() => setEditing('new')}>
            + Nueva pregunta
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Buscar"
            placeholder="Texto del enunciado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
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
          <Select label="Tema" value={tema} onChange={(e) => setTema(e.target.value)}>
            <option value="">Todos</option>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo || t.codigo}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>Error al cargar: {error?.message || 'No se pudo conectar al servidor'}</span>
          <button type="button" className="underline" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-sm text-gray-500 italic text-center">
            No se encontraron preguntas. Cree una nueva con el botón superior.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Enunciado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dificultad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tags</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-igss-50 cursor-pointer"
                    onClick={() => setEditing(p)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      #{p.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {(TIPOS.find((t) => t.value === p.tipo) || {}).label || p.tipo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                      {(p.enunciado || '').slice(0, 80)}
                      {(p.enunciado || '').length > 80 ? '…' : ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DificultadBadge dif={p.dificultad} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {Array.isArray(p.tags) && p.tags.length > 0
                        ? p.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="inline-block bg-gray-100 text-gray-700 rounded px-2 py-0.5 mr-1"
                            >
                              {t}
                            </span>
                          ))
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="text-xs font-medium text-igss-700 hover:text-igss-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(p);
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal
          open={true}
          onClose={() => setEditing(null)}
          title={editing === 'new' ? 'Nueva pregunta' : `Editar pregunta #${editing.id}`}
          size="xl"
        >
          <PreguntaEditor
            pregunta={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
            temas={temas}
          />
        </Modal>
      )}
    </div>
  );
}

function DificultadBadge({ dif }) {
  const map = {
    BAJA: { tone: 'green', label: 'Baja' },
    MEDIA: { tone: 'yellow', label: 'Media' },
    ALTA: { tone: 'red', label: 'Alta' },
  };
  const cfg = map[dif] || { tone: 'default', label: dif || '—' };
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

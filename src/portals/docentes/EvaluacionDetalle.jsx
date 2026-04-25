import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EvaluacionRadar from './EvaluacionRadar';
import { useAuth } from '../../contexts/AuthContext';
import { formatFechaCorta } from '../../lib/format';
import EvaluacionLlenado from './EvaluacionLlenado';

/**
 * EvaluacionDetalle — vista de una evaluación.
 * Si DRAFT y pertenece al docente actual → renderea EvaluacionLlenado (continuar).
 * Si FIRMADA → vista read-only con metadata + radar + tabla items + comentarios + descargar PDF.
 */
export default function EvaluacionDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error } = useApi(`/api/docente/evaluaciones/${id}`);

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
        Error: {error.message}
      </div>
    );
  }
  if (!data) return null;

  const isDraft = data.estado === 'DRAFT';
  const isOwnerOrAdmin =
    user?.es_admin ||
    user?.rol === 'admin' ||
    data?.docente?.id === user?.docente_id ||
    data?.docente_id === user?.docente_id;

  // Si DRAFT y es del docente → continuar llenando con el componente apropiado.
  if (isDraft && isOwnerOrAdmin) {
    return <EvaluacionLlenado />;
  }

  // Vista read-only (firmada)
  const radarData =
    data.dimensiones_detalle?.map((d) => ({
      dimension: d.titulo,
      valor: Number(d.porcentaje) || 0,
    })) || [];

  const handleDescargarPDF = () => {
    // El backend genera el PDF; aquí solo abrimos en nueva pestaña.
    const token = localStorage.getItem('sfyc_token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    window.open(
      `${baseUrl}/docente/evaluaciones/${id}/pdf?token=${encodeURIComponent(token || '')}`,
      '_blank',
    );
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <Link
          to={
            data.residente?.id
              ? `/docentes/residentes/${data.residente.id}`
              : '/docentes/evaluaciones'
          }
          className="text-sm text-igss-700 hover:text-igss-900"
        >
          ← Volver
        </Link>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-igss-900">
              Evaluación {data.rubrica?.codigo || '?'}{' '}
              {data.tema?.titulo ? `· ${data.tema.titulo}` : ''}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Residente:{' '}
              <strong>{data.residente?.nombre_completo}</strong> · Fecha:{' '}
              {formatFechaCorta(data.fecha_evaluacion)} · Modalidad:{' '}
              {data.modalidad}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Firmada por: {data.docente?.nombre_completo || '—'}
              {data.firmada_at &&
                ` · ${formatFechaCorta(data.firmada_at)}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge color={isDraft ? 'amber' : 'green'}>{data.estado}</Badge>
            {data.porcentaje != null && (
              <div className="text-3xl font-bold text-igss-900">
                {Number(data.porcentaje).toFixed(0)}%
              </div>
            )}
            {data.nivel_global && (
              <div className="text-sm text-gray-600">{data.nivel_global}</div>
            )}
          </div>
        </div>
      </Card>

      {radarData.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Perfil por dimensión
          </h2>
          <EvaluacionRadar data={radarData} height={340} />
        </Card>
      )}

      {data.dimensiones_detalle && data.dimensiones_detalle.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Dimensión
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Ítem
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Nivel
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Puntaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data.dimensiones_detalle.flatMap((dim) =>
                  (dim.items || []).map((it) => (
                    <tr key={`${dim.id}-${it.id}`}>
                      <td className="px-4 py-2 text-sm text-gray-700 align-top">
                        {dim.titulo}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {it.texto}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {it.nivel_seleccionado ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {it.puntaje ?? '—'}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(data.observaciones || data.fortalezas || data.areas_mejora) && (
        <Card className="p-5 space-y-4">
          {data.observaciones && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Observaciones
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {data.observaciones}
              </p>
            </div>
          )}
          {data.fortalezas && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Fortalezas
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {data.fortalezas}
              </p>
            </div>
          )}
          {data.areas_mejora && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Áreas de mejora
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {data.areas_mejora}
              </p>
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Volver
        </Button>
        <div className="flex gap-2">
          {isDraft && isOwnerOrAdmin && (
            <Button onClick={() => navigate(`/docentes/evaluaciones/${id}/llenar`)}>
              Continuar llenando →
            </Button>
          )}
          <Button variant="secondary" onClick={handleDescargarPDF}>
            📥 Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Spinner from '../../components/ui/Spinner';
import LlenadoGenerica from './LlenadoGenerica';
import LlenadoTemaGYO from './LlenadoTemaGYO';
import LlenadoTemaPediatria from './LlenadoTemaPediatria';

/**
 * EvaluacionLlenado — router por tipo de rúbrica.
 * GET /api/docente/evaluaciones/{id}
 *
 * Si estado != DRAFT → renderea EvaluacionDetalle (read-only) — manejado en router.
 */
export default function EvaluacionLlenado() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useApi(`/api/docente/evaluaciones/${id}`);

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
        Error al cargar la evaluación: {error.message}
      </div>
    );
  }
  if (!data) return null;

  const codigo = data.rubrica?.codigo || data.rubrica_codigo;
  const Component =
    {
      GENERICA: LlenadoGenerica,
      GYO: LlenadoTemaGYO,
      PEDIATRIA: LlenadoTemaPediatria,
    }[codigo];

  if (!Component) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        Tipo de rúbrica no soportado: <strong>{codigo || '?'}</strong>
      </div>
    );
  }

  return <Component evaluacion={data} onRefetch={refetch} />;
}

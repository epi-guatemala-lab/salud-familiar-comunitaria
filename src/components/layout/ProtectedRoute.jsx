import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const loginPath =
      requiredRole === 'docente' ? '/docentes/login' : '/estudiantes/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  const isAdmin = Boolean(user?.es_admin) || user?.rol === 'admin';

  // Portal estudiante requiere `residente_id`. Un admin sin residente_id
  // que aterriza acá vería el dashboard roto con error "No tiene residente
  // vinculado". Redirigir al portal docentes (donde sí tiene contexto).
  if (
    requiredRole === 'estudiante'
    && isAdmin
    && !user?.residente_id
    && user?.rol !== 'estudiante'
  ) {
    return <Navigate to="/docentes" replace />;
  }

  // Admin con docente_id (o sin restricción) tiene acceso a docentes.
  if (requiredRole && user?.rol !== requiredRole && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

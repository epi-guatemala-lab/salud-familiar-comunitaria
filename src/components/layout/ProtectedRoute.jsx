import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasAnyPermission, hasAnyRole, isAdmin } from '../../lib/permissions';

export default function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles = [],
  requiredPermissions = [],
  loginPath,
  accessCheck,
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const destination =
      loginPath || (requiredRole === 'docente' ? '/docentes/login' : '/estudiantes/login');
    return <Navigate to={destination} state={{ from: location }} replace />;
  }

  const userIsAdmin = isAdmin(user);

  // Portal estudiante requiere `residente_id`. Un admin sin residente_id
  // que aterriza acá vería el dashboard roto con error "No tiene residente
  // vinculado". Redirigir al portal docentes (donde sí tiene contexto).
  if (
    requiredRole === 'estudiante'
    && userIsAdmin
    && !user?.residente_id
    && user?.rol !== 'estudiante'
  ) {
    return <Navigate to="/docentes" replace />;
  }

  // Admin con docente_id (o sin restricción) tiene acceso a docentes.
  if (requiredRole && user?.rol !== requiredRole && !userIsAdmin) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && !userIsAdmin && !hasAnyRole(user, allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermissions.length > 0 && !hasAnyPermission(user, requiredPermissions)) {
    return <Navigate to="/" replace />;
  }

  if (accessCheck && !accessCheck(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

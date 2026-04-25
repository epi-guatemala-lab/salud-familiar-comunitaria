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

  // Admin tiene acceso a portales docente y estudiante.
  if (requiredRole && user?.rol !== requiredRole && !user?.es_admin && user?.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

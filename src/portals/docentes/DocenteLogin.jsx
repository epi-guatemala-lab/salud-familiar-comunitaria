import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../../components/shared/LoginForm';
import { useAuth } from '../../contexts/AuthContext';

/**
 * DocenteLogin
 * - Reusa <LoginForm portal="docentes"> que provee el agente A.
 * - Si ya está autenticado y rol === 'docente'/admin → redirige al dashboard.
 * - Soporta `?redirect=/ruta` y `state.from` para volver al destino original tras login.
 */
export default function DocenteLogin() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const redirectParam = params.get('redirect');
  const fromState = location.state?.from?.pathname;
  const targetPath = redirectParam || fromState || '/docentes';

  // Si ya hay sesión activa y rol válido, ir directo al dashboard.
  useEffect(() => {
    if (isAuthenticated && user && (user.rol === 'docente' || user.es_admin || user.rol === 'admin')) {
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, targetPath]);

  if (isAuthenticated && user && (user.rol === 'docente' || user.es_admin || user.rol === 'admin')) {
    return <Navigate to={targetPath} replace />;
  }

  /**
   * Callback que recibe LoginForm tras login exitoso.
   * Cambio de contraseña deshabilitado por ahora — siempre va al dashboard.
   */
  const handleSuccess = () => {
    navigate(targetPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-igss-50 to-igss-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-igss mb-4">
            <span className="text-4xl" role="img" aria-label="rama">🌱</span>
          </div>
          <h1 className="text-2xl font-bold text-igss-800">Portal Docentes SFyC</h1>
          <p className="text-sm text-igss-700 mt-1">
            Salud Familiar y Comunitaria · IGSS
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-igss p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Iniciar sesión</h2>
          <LoginForm portal="docentes" onSuccess={handleSuccess} />

          <p className="mt-4 text-xs text-gray-500 text-center">
            ¿Olvidó su contraseña? Contacte al administrador.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Sistema oficial IGSS · Solo personal autorizado
        </p>
      </div>
    </div>
  );
}

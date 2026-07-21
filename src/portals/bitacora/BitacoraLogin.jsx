import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../../components/shared/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { BASE_URL } from '../../config/env';
import { canAccessBitacora } from '../../lib/permissions';

function safeTarget(location) {
  const requested = location.state?.from?.pathname;
  return requested?.startsWith('/bitacora') ? requested : '/bitacora';
}

export default function BitacoraLogin() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const target = safeTarget(location);
  const allowed = isAuthenticated && canAccessBitacora(user);

  useEffect(() => {
    if (!allowed) return;
    navigate(user?.password_reset_required ? '/bitacora/cambiar-contrasena' : target, {
      replace: true,
    });
  }, [allowed, navigate, target, user?.password_reset_required]);

  if (allowed) {
    return (
      <Navigate
        to={user?.password_reset_required ? '/bitacora/cambiar-contrasena' : target}
        replace
      />
    );
  }

  const onSuccess = (response) => {
    navigate(
      response.password_reset_required || response.user?.password_reset_required
        ? '/bitacora/cambiar-contrasena'
        : target,
      { replace: true }
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-igss-50 via-white to-igss-100 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="text-center">
          <img
            src={`${BASE_URL}sfyc-logo.png`}
            alt="Salud Familiar y Comunitaria IGSS"
            className="mx-auto h-24 w-24 rounded-full bg-white object-contain p-2 shadow-igss"
          />
          <h1 className="mt-4 text-2xl font-bold text-igss-900">Bitácora SFyC</h1>
          <p className="mt-1 text-sm text-gray-600">Cronograma y control documental institucional</p>
        </div>

        <section className="mt-6 rounded-2xl border border-igss-100 bg-white p-6 shadow-igss" aria-labelledby="login-title">
          <h2 id="login-title" className="text-lg font-bold text-gray-900">Iniciar sesión</h2>
          <p className="mb-4 mt-1 text-sm text-gray-600">Use su cuenta individual. No comparta credenciales.</p>
          <LoginForm validateAccess={canAccessBitacora} onSuccess={onSuccess} />
          <p className="mt-4 text-center text-xs text-gray-500">
            Si necesita una cuenta o restablecer su contraseña, contacte al administrador SFyC.
          </p>
        </section>

        <p className="mt-5 text-center text-xs text-gray-500">
          Sistema oficial IGSS · Acceso auditado para personal autorizado
        </p>
      </div>
    </main>
  );
}

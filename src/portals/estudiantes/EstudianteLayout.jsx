import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import LogoutButton from '../../components/shared/LogoutButton';
import { useAuth } from '../../contexts/AuthContext';

/**
 * EstudianteLayout
 * Wrapper para todas las páginas autenticadas del portal de estudiantes/residentes.
 * - Verifica rol === 'estudiante' (o admin).
 * - Header con branding + LogoutButton.
 * - Sidebar (drawer en mobile) con: Dashboard, Exámenes, Calificaciones,
 *   Calendario, Boleta.
 * - <Outlet /> renderiza la ruta hija.
 */
export default function EstudianteLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/estudiantes/login" state={{ from: location }} replace />;
  }
  if (
    user &&
    user.rol !== 'estudiante' &&
    user.rol !== 'admin' &&
    !user.es_admin
  ) {
    return <Navigate to="/" replace />;
  }

  const links = [
    { to: '/estudiantes', label: 'Dashboard', icon: '🏠', exact: true },
    { to: '/estudiantes/examenes', label: 'Exámenes', icon: '📝' },
    { to: '/estudiantes/calificaciones', label: 'Calificaciones', icon: '📊' },
    { to: '/estudiantes/calendario', label: 'Calendario', icon: '📅' },
    { to: '/estudiantes/boleta', label: 'Boleta', icon: '📄' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        portal="estudiantes"
        right={
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-medium text-igss-900">
                  {user.nombre_completo || user.username}
                </span>
                <span className="text-xs text-igss-700">
                  {user.anio_residencia ? `R${user.anio_residencia}` : 'Estudiante'}
                </span>
              </div>
            )}
            <LogoutButton />
            <button
              type="button"
              onClick={() => setSidebarOpen((s) => !s)}
              className="md:hidden p-2 rounded hover:bg-igss-100"
              aria-label="Menú"
            >
              <span className="text-xl">{sidebarOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-1 w-full">
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } md:block fixed md:static inset-0 md:inset-auto z-40 md:z-0 bg-white md:bg-transparent w-64 md:w-56 flex-shrink-0 border-r border-gray-200 md:border-r-0 md:bg-white shadow-md md:shadow-none`}
        >
          <nav className="sticky top-0 p-4 space-y-1">
            <div className="md:hidden mb-4 pb-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-igss-800">Menú</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Cerrar menú"
                className="p-1 rounded hover:bg-igss-100"
              >
                ✕
              </button>
            </div>

            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-igss-100 text-igss-800'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}

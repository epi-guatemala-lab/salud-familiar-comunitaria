import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import LogoutButton from '../../components/shared/LogoutButton';
import { useAuth } from '../../contexts/AuthContext';

/**
 * DocenteLayout
 * Wrapper para todas las pages autenticadas del portal docente.
 * - Verifica rol === 'docente' o es_admin / rol === 'admin'.
 * - Header con branding + LogoutButton.
 * - Sidebar (responsive: drawer en mobile) con links principales.
 * - <Outlet /> renderiza la ruta hija.
 * - Footer.
 */
export default function DocenteLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/docentes/login" state={{ from: location }} replace />;
  }
  if (user && user.rol !== 'docente' && user.rol !== 'admin' && !user.es_admin) {
    return <Navigate to="/" replace />;
  }

  const links = [
    { to: '/docentes', label: 'Dashboard', icon: '🏠', exact: true },
    { to: '/docentes/residentes', label: 'Residentes', icon: '👥' },
    { to: '/docentes/examenes', label: 'Exámenes', icon: '📝' },
    { to: '/docentes/preguntas', label: 'Banco', icon: '💾' },
    { to: '/docentes/respuestas-abiertas', label: 'Respuestas Abiertas', icon: '✏️' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        showSfycLogo
        portal="Portal Docentes SFyC"
        right={
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-medium text-igss-900">
                  {user.nombre_completo || user.username}
                </span>
                <span className="text-xs text-igss-700">
                  {user.es_admin || user.rol === 'admin' ? 'Administrador' : 'Docente'}
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
        {/* Sidebar */}
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

            <div className="pt-4 mt-4 border-t border-gray-200 space-y-1">
              <Link
                to="/docentes/evaluaciones/nueva"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-igss-700 text-white hover:bg-igss-800"
              >
                <span>+</span>
                <span>Nueva evaluación</span>
              </Link>
              <Link
                to="/docentes/examenes/nuevo"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-igss-700 text-igss-800 hover:bg-igss-50"
              >
                <span>+</span>
                <span>Crear examen</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Backdrop mobile */}
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

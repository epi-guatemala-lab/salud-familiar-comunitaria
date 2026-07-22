import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import LogoutButton from '../../components/shared/LogoutButton';
import { useAuth } from '../../contexts/AuthContext';
import { bitacoraApi } from './api';
import { hasBitacoraCapability, isAdmin, isBitacoraSecretary, userRoles } from '../../lib/permissions';
import { normalizePaginated, UNSAVED_CHANGES_MESSAGE } from './model';
import { EVENTS } from '../../config/constants';

function roleLabel(user) {
  if (isAdmin(user)) return 'Administrador SFyC';
  if (isBitacoraSecretary(user)) return 'Secretaría de control documental';
  if (userRoles(user).includes('bitacora.director')) return 'Director';
  return 'Asistente';
}

export default function BitacoraLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [wizardHasUnsavedChanges, setWizardHasUnsavedChanges] = useState(false);
  const menuButtonRef = useRef(null);
  const navigationRef = useRef(null);
  const secretary = isBitacoraSecretary(user);
  const canCreate = hasBitacoraCapability(user, 'create');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = normalizePaginated(await bitacoraApi.listNotifications({ page: 1, limit: 1, leida: false }));
        if (alive) setUnread(data.total);
      } catch {
        // El contador no debe bloquear el resto del portal.
      }
    };
    load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener(EVENTS.BITACORA_NOTIFICATIONS_CHANGED, load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener(EVENTS.BITACORA_NOTIFICATIONS_CHANGED, load);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => {
      navigationRef.current?.querySelector('a[href]')?.focus();
    }, 0);
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [menuOpen]);

  const links = [
    { to: '/bitacora', label: 'Inicio', icon: '⌂', end: true },
    { to: '/bitacora/calendario', label: 'Calendario', icon: '▦' },
    { to: '/bitacora/actividades', label: 'Actividades', icon: '≡' },
    ...(secretary ? [{ to: '/bitacora/control', label: 'Control documental', icon: '✓' }] : []),
    {
      to: '/bitacora/notificaciones',
      label: unread > 0 ? `Notificaciones (${unread})` : 'Notificaciones',
      icon: '◉',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a
        href="#contenido-principal"
        className="sr-only z-50 rounded-lg bg-white px-4 py-3 font-bold text-igss-900 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido principal
      </a>
      <Header
        showSfycLogo
        portal="Bitácora SFyC"
        subtitle="Cronograma y control documental"
        right={
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-gray-900">{user?.nombre || user?.nombre_completo || user?.username}</div>
              <div className="text-xs text-gray-600">{roleLabel(user)}</div>
            </div>
            <LogoutButton
              className="min-h-11"
              confirmMessage={wizardHasUnsavedChanges ? UNSAVED_CHANGES_MESSAGE : ''}
            />
            <button
              ref={menuButtonRef}
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-igss-200 text-xl text-igss-900 md:hidden"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              aria-controls="bitacora-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? '×' : '☰'}
            </button>
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <aside
          ref={navigationRef}
          id="bitacora-navigation"
          className={`${menuOpen ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-40 w-72 border-r border-gray-200 bg-white pt-4 shadow-xl md:static md:block md:w-60 md:pt-0 md:shadow-none`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-3 md:hidden">
            <strong className="text-igss-900">Bitácora SFyC</strong>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100"
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
            >
              ×
            </button>
          </div>
          <nav className="sticky top-0 space-y-1 p-4" aria-label="Navegación de Bitácora">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                    isActive ? 'bg-igss-100 text-igss-900' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span className="w-5 text-center text-lg" aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
            {canCreate && <div className="mt-4 border-t border-gray-200 pt-4">
              <NavLink
                to="/bitacora/actividades/nueva"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center justify-center rounded-lg bg-igss-700 px-3 text-sm font-bold text-white hover:bg-igss-800"
              >
                + Nueva actividad
              </NavLink>
            </div>}
          </nav>
        </aside>

        {menuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <main id="contenido-principal" className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet context={{ setWizardHasUnsavedChanges }} />
        </main>
      </div>
      <Footer />
    </div>
  );
}

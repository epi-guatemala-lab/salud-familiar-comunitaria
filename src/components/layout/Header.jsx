import { Link } from 'react-router-dom';
import LogoutButton from '../shared/LogoutButton';
import { BASE_URL } from '../../config/env';

export default function Header({ showSfycLogo = false, user, portal, subtitle }) {
  const igssLogo = `${BASE_URL}igss-logo.png`;
  const sfycLogo = `${BASE_URL}sfyc-logo.png`;

  return (
    <header className="bg-white border-b-2 border-igss-700 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3" aria-label="Inicio">
          <img
            src={igssLogo}
            alt="IGSS"
            className="h-12 w-12 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {showSfycLogo && (
            <>
              <div className="h-10 w-px bg-gray-300" />
              <img
                src={sfycLogo}
                alt="SFyC"
                className="h-12"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </>
          )}
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-igss-800 leading-tight">
              {portal || 'Instituto Guatemalteco de Seguridad Social'}
            </h1>
            <p className="text-xs text-gray-600">{subtitle || 'Salud Familiar y Comunitaria'}</p>
          </div>
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-800">{user.nombre}</div>
              <div className="text-xs text-gray-500">{user.rol}</div>
            </div>
            <LogoutButton />
          </div>
        )}
      </div>
      <div className="h-1 bg-gradient-to-r from-igss-700 via-igss-gold to-igss-700" />
    </header>
  );
}

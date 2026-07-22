import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LogoutButton({ className = '', confirmMessage = '' }) {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  if (!isAuthenticated) return null;

  const handle = async () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    await logout();
    navigate('/');
  };

  return (
    <button
      type="button"
      onClick={handle}
      // Hit area más generosa (px-3 py-1.5) — antes el botón era texto
      // subrayado pequeño y el primer click solía caer al área del nombre
      // de usuario que está al lado.
      className={`text-sm text-igss-700 hover:text-igss-900 hover:bg-igss-50 active:bg-igss-100 font-medium px-3 py-1.5 rounded-md border border-transparent hover:border-igss-200 transition-colors ${className}`}
    >
      Cerrar sesión
    </button>
  );
}

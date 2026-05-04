import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LogoutButton({ className = '' }) {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  if (!isAuthenticated) return null;

  const handle = async () => {
    await logout();
    navigate('/');
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={`text-sm text-igss-700 hover:text-igss-900 font-medium underline ${className}`}
    >
      Cerrar sesión
    </button>
  );
}

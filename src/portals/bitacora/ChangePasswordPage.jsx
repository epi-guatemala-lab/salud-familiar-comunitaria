import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';
import { canAccessBitacora } from '../../lib/permissions';

export default function ChangePasswordPage() {
  const { isAuthenticated, user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) return <Navigate to="/bitacora/login" replace />;
  if (!canAccessBitacora(user)) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (next.length < 8 || !/[A-ZÁÉÍÓÚÑ]/.test(next) || !/\d/.test(next)) {
      setError('Use al menos 8 caracteres, una mayúscula y un número.');
      return;
    }
    if (next !== confirm) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/auth/change-password', {
        old_password: current,
        new_password: next,
      });
      updateUser((previous) => ({ ...previous, password_reset_required: false }));
      toast.success('Contraseña actualizada.');
      navigate('/bitacora', { replace: true });
    } catch (requestError) {
      setError(requestError?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-igss-50 px-4 py-8">
      <form onSubmit={submit} className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-igss">
        <h1 className="text-2xl font-bold text-igss-900">Cambie su contraseña temporal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Este paso es obligatorio antes de acceder a la Bitácora. La contraseña es personal.
        </p>
        <div className="mt-6 space-y-4">
          <Input
            name="current-password"
            type="password"
            autoComplete="current-password"
            label="Contraseña temporal"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
          <Input
            name="new-password"
            type="password"
            autoComplete="new-password"
            label="Nueva contraseña"
            hint="Mínimo 8 caracteres, una mayúscula y un número."
            value={next}
            onChange={(event) => setNext(event.target.value)}
            required
          />
          <Input
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            label="Confirmar nueva contraseña"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        <Button type="submit" fullWidth className="mt-5 min-h-11" loading={submitting}>
          Guardar y continuar
        </Button>
      </form>
    </main>
  );
}

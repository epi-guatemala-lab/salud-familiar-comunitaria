import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function LoginForm({ rolEsperado, validateAccess, onSuccess }) {
  const { login, logout } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Ingrese usuario y contraseña');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await login(username.trim().toLowerCase(), password);
      const roleDenied =
        rolEsperado && res.user?.rol !== rolEsperado && res.user?.rol !== 'admin';
      const accessDenied = validateAccess && !validateAccess(res.user);
      if (roleDenied || accessDenied) {
        await logout();
        setError('Esta cuenta no tiene acceso a este portal');
        return;
      }
      onSuccess?.(res);
    } catch (err) {
      const msg = err?.message || 'Error al iniciar sesión';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="username"
        label="Usuario"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        autoFocus
      />
      <Input
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded text-sm">
          {error}
        </div>
      )}
      <Button type="submit" loading={submitting} fullWidth>
        Iniciar sesión
      </Button>
    </form>
  );
}

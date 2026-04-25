import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import {
  decodeJWT,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredAuth,
} from '../lib/auth';
import { STORAGE_KEYS, EVENTS } from '../config/constants';

export const AuthContext = createContext(null);

// Re-export del hook para que los componentes puedan importar desde el context.
export { useAuth } from '../hooks/useAuth';

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getStoredToken());
  const [user, setUserState] = useState(() => getStoredUser());

  const applyAuth = useCallback((newToken, newUser) => {
    setTokenState(newToken);
    setUserState(newUser);
    setStoredToken(newToken);
    setStoredUser(newUser);
  }, []);

  const login = useCallback(
    async (username, password, fingerprint = null) => {
      const res = await api.post(
        '/api/auth/login',
        { username, password, fingerprint },
        { auth: false }
      );
      applyAuth(res.token, res.user);
      return res;
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      /* ignore — limpiamos local de todas formas */
    }
    clearStoredAuth();
    setTokenState(null);
    setUserState(null);
  }, []);

  // Auto-logout cuando el token expira
  useEffect(() => {
    if (!token) return undefined;
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      // Token corrupto
      clearStoredAuth();
      setTokenState(null);
      setUserState(null);
      return undefined;
    }
    const ms = payload.exp * 1000 - Date.now();
    if (ms <= 0) {
      clearStoredAuth();
      setTokenState(null);
      setUserState(null);
      return undefined;
    }
    const t = setTimeout(() => {
      clearStoredAuth();
      setTokenState(null);
      setUserState(null);
    }, ms);
    return () => clearTimeout(t);
  }, [token]);

  // Sync entre tabs: si se borra el token en otra tab, esta tambien se desloguea.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.TOKEN) {
        if (!e.newValue) {
          setTokenState(null);
          setUserState(null);
        } else if (e.newValue !== token) {
          // Otra tab hizo login con cuenta distinta — refrescamos
          setTokenState(e.newValue);
          const u = getStoredUser();
          setUserState(u);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [token]);

  // Listener global del API: 401 → limpiar credenciales y notificar.
  useEffect(() => {
    const onAuthInvalidated = () => {
      clearStoredAuth();
      setTokenState(null);
      setUserState(null);
    };
    window.addEventListener(EVENTS.AUTH_INVALIDATED, onAuthInvalidated);
    return () => window.removeEventListener(EVENTS.AUTH_INVALIDATED, onAuthInvalidated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

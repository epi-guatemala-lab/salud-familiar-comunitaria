import { STORAGE_KEYS } from '../config/constants';
import { safeGet, safeSet, safeRemove } from './storage';

// Decodifica el payload de un JWT (sin validar firma — eso es server-side).
export function decodeJWT(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function isExpired(token) {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 < Date.now();
}

export function getStoredToken() {
  return safeGet(STORAGE_KEYS.TOKEN);
}

export function setStoredToken(token) {
  if (token) safeSet(STORAGE_KEYS.TOKEN, token);
  else safeRemove(STORAGE_KEYS.TOKEN);
}

export function getStoredUser() {
  const raw = safeGet(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) safeSet(STORAGE_KEYS.USER, JSON.stringify(user));
  else safeRemove(STORAGE_KEYS.USER);
}

export function clearStoredAuth() {
  safeRemove(STORAGE_KEYS.TOKEN);
  safeRemove(STORAGE_KEYS.USER);
}

export function getRoleFromToken(token) {
  const p = decodeJWT(token);
  return p?.rol || null;
}

export function getRemainingMs(token) {
  const p = decodeJWT(token);
  if (!p?.exp) return 0;
  return Math.max(0, p.exp * 1000 - Date.now());
}

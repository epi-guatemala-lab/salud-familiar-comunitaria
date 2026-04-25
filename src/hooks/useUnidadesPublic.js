import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { STORAGE_KEYS } from '../config/constants';
import { getJSON, setJSON } from '../lib/storage';

const CACHE_KEY = STORAGE_KEYS.UNIDADES_CACHE;
const CACHE_TTL_MS = 24 * 3600 * 1000;

// Lista minima de fallback estatico — coincide con el catalogo mas comun de
// unidades IGSS para no romper el form si el backend esta caido al inicio.
// El backend real provee la lista completa con departamento + tipo.
const FALLBACK_UNIDADES = [
  { id: 1, codigo: 'HGE', nombre: 'Hospital General de Enfermedades', departamento: 'GUATEMALA', tipo: 'hospital' },
  { id: 2, codigo: 'HGQ', nombre: 'Hospital General de Quetzaltenango', departamento: 'QUETZALTENANGO', tipo: 'hospital' },
  { id: 3, codigo: 'CAMIP1', nombre: 'CAMIP 1 Pamplona', departamento: 'GUATEMALA', tipo: 'camip' },
  { id: 4, codigo: 'CAMIP2', nombre: 'CAMIP 2 Zona 6', departamento: 'GUATEMALA', tipo: 'camip' },
  { id: 5, codigo: 'JUTIAPA', nombre: 'Hospital de Jutiapa', departamento: 'JUTIAPA', tipo: 'hospital' },
];

export function useUnidadesPublic() {
  const [unidades, setUnidades] = useState(() => {
    const cached = getJSON(CACHE_KEY, null);
    if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL_MS && Array.isArray(cached.data)) {
      return cached.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(unidades === null);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let alive = true;

    // Si ya tenemos cache fresco, no refetch.
    const cached = getJSON(CACHE_KEY, null);
    if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL_MS) {
      setUnidades(cached.data);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        const res = await api.get('/api/unidades/public', { auth: false });
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!alive) return;
        if (data.length === 0) {
          throw new Error('Catalogo vacio');
        }
        setUnidades(data);
        setJSON(CACHE_KEY, { ts: Date.now(), data });
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(err);
        setUnidades(FALLBACK_UNIDADES);
        setUsedFallback(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { unidades: unidades || [], loading, error, usedFallback };
}

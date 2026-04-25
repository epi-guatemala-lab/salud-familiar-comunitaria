import { useState, useEffect, useCallback, useRef } from 'react';
import { getJSON, setJSON, safeRemove } from '../lib/storage';

// Hook con persistencia opcional en localStorage. Recupera el draft al montar
// y lo guarda en cada cambio (debounced via microtask).
export function useFormState(storageKey, initialValue) {
  const [formData, setFormData] = useState(() => {
    if (!storageKey) return initialValue;
    const cached = getJSON(storageKey, null);
    if (cached && typeof cached === 'object') {
      return { ...initialValue, ...cached };
    }
    return initialValue;
  });

  const keyRef = useRef(storageKey);
  useEffect(() => {
    keyRef.current = storageKey;
  }, [storageKey]);

  // Persistir
  useEffect(() => {
    if (!keyRef.current) return;
    const id = setTimeout(() => setJSON(keyRef.current, formData), 200);
    return () => clearTimeout(id);
  }, [formData]);

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateMany = useCallback((patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearForm = useCallback(() => {
    if (keyRef.current) safeRemove(keyRef.current);
    setFormData(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { formData, setFormData, updateField, updateMany, clearForm };
}

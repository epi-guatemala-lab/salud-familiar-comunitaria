import { useCallback, useEffect, useRef, useState } from 'react';

export function useRemote(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const result = await loader();
      if (requestRef.current !== requestId) return result;
      setData(result);
      setError(null);
      return result;
    } catch (requestError) {
      if (requestRef.current === requestId) setError(requestError);
      return null;
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    reload();
    return () => {
      requestRef.current += 1;
    };
  }, [reload]);

  return { data, setData, loading, error, reload };
}

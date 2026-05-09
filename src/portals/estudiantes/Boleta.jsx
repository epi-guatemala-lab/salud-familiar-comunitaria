import { useState } from 'react';
import { VITE_API_URL } from '../../config/env';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { STORAGE_KEYS } from '../../config/constants';

/**
 * Boleta — descarga del transcript oficial del estudiante.
 *
 * GET /api/estudiante/boleta-resumen → { nombre, anio_residencia,
 *   rotaciones_cursadas: [...], promedio_final, fecha_emision }
 * GET /api/estudiante/transcript.pdf → PDF blob
 */
export default function Boleta() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error } = useApi('/api/estudiante/boleta-resumen');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const base = VITE_API_URL.replace(/\/$/, '');
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const res = await fetch(`${base}/api/estudiante/transcript.pdf`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = `boleta_${(user?.username || 'estudiante').toLowerCase()}.pdf`;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Boleta descargada');
    } catch (err) {
      toast.error(err?.message || 'No se pudo descargar la boleta');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-igss-900">Mi boleta oficial</h1>
        <p className="text-sm text-gray-600 mt-1">
          Documento oficial con su historial académico de la residencia
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          Error al cargar resumen: {error?.message || 'No se pudo conectar al servidor'}
        </div>
      )}

      <Card className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <ResumenRow label="Nombre" value={data?.nombre || user?.nombre_completo || '—'} />
            <ResumenRow
              label="Año de residencia"
              value={
                data?.anio_residencia
                  ? `R${data.anio_residencia}`
                  : user?.anio_residencia
                  ? `R${user.anio_residencia}`
                  : '—'
              }
            />
            <ResumenRow
              label="Rotaciones cursadas"
              value={
                Array.isArray(data?.rotaciones_cursadas) &&
                data.rotaciones_cursadas.length > 0
                  ? data.rotaciones_cursadas.join(', ')
                  : '—'
              }
            />
            <ResumenRow
              label="Promedio final"
              value={
                data?.promedio_final != null
                  ? `${Number(data.promedio_final).toFixed(1)}`
                  : 'En curso'
              }
            />
            {data?.fecha_emision && (
              <ResumenRow
                label="Fecha emisión"
                value={new Date(data.fecha_emision).toLocaleDateString('es-GT')}
              />
            )}
          </div>
        )}

        <div className="pt-4 border-t flex flex-col items-center gap-2">
          <Button
            type="button"
            size="lg"
            fullWidth
            loading={downloading}
            onClick={handleDownload}
          >
            📄 Descargar mi boleta oficial
          </Button>
          <p className="text-xs text-gray-500 text-center mt-1">
            La descarga inicia automáticamente al hacer clic.
          </p>
        </div>
      </Card>

      <Card className="p-4 bg-amber-50 border border-amber-200">
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Aviso:</span> La boleta es un documento oficial
          firmado digitalmente por el coordinador del programa. Mantenga una copia segura
          y verifique el código de autenticidad en cada página antes de presentarla.
        </p>
      </Card>
    </div>
  );
}

function ResumenRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-600 uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className="text-sm font-semibold text-igss-900">{value}</span>
    </div>
  );
}

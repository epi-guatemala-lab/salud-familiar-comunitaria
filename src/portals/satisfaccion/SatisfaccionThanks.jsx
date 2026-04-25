import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { STORAGE_KEYS } from '../../config/constants';
import { safeRemove } from '../../lib/storage';

/**
 * SatisfaccionThanks — pantalla post-envío de la encuesta de satisfacción.
 *
 * Si llega con `?offline=1` muestra mensaje de cola; sino muestra confirmación
 * de envío exitoso. Limpia el UUID idempotente al montar.
 */
export default function SatisfaccionThanks() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const offline = params.get('offline') === '1';

  useEffect(() => {
    // Limpieza defensiva: en SatisfaccionPage también se hace, pero aquí
    // garantizamos que un usuario que llegue por URL directa también limpie.
    try {
      safeRemove(STORAGE_KEYS.ENCUESTA_UUID);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-igss-50">
      <Header showSfycLogo portal="Encuesta de Satisfacción" />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <Card className={`p-8 text-center border-2 ${offline ? 'border-amber-400 bg-amber-50' : 'border-igss-600 bg-white'}`}>
          <div
            className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-5xl mb-4 ${
              offline ? 'bg-amber-100' : 'bg-igss-100'
            }`}
            aria-hidden="true"
          >
            {offline ? '📭' : '✅'}
          </div>

          <h1 className="text-2xl font-bold text-igss-900 mb-2">
            {offline ? 'Encuesta guardada localmente' : '¡Gracias por su tiempo!'}
          </h1>

          <p className="text-base text-gray-700 mb-6">
            {offline
              ? 'Su encuesta se guardó localmente y se enviará automáticamente cuando se restablezca la conexión a internet.'
              : 'Su encuesta fue enviada exitosamente. Sus respuestas son anónimas y nos ayudan a mejorar la atención.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              type="button"
              onClick={() => navigate('/satisfaccion')}
              size="lg"
            >
              Llenar otra encuesta
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/')}
              size="lg"
            >
              Salir
            </Button>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-500">
          IGSS · Salud Familiar y Comunitaria
        </p>
      </main>

      <Footer />
    </div>
  );
}

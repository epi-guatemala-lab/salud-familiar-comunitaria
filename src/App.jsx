import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/layout/ErrorBoundary';
import OfflineQueueSync from './components/OfflineQueueSync';
import router from './router';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          {/* Motor de la cola offline montado UNA vez: drena pendientes al
              montar, al volver la red, al enfocar la pestaña y cada 60 s. */}
          <OfflineQueueSync />
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

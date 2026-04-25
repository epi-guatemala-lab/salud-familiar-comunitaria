import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-6xl font-bold text-igss-700 mb-2">404</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Pagina no encontrada</h1>
          <p className="text-sm text-gray-600 mb-4">
            La direccion que intenta acceder no existe.
          </p>
          <Link to="/" className="text-igss-700 hover:underline font-semibold">
            ← Volver al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

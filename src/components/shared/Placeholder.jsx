import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const PORTAL_INFO = {
  docentes: {
    title: 'Portal de Docentes',
    emoji: '👨‍⚕️',
    description:
      'Gestión de evaluaciones, exámenes y residentes. Esta sección está en construcción.',
  },
  estudiantes: {
    title: 'Portal de Estudiantes',
    emoji: '🎓',
    description:
      'Exámenes, calificaciones y boletas. Esta sección está en construcción.',
  },
  satisfaccion: {
    title: 'Encuesta de Satisfacción',
    emoji: '📋',
    description: 'Esta sección está en construcción.',
  },
};

export default function Placeholder({ portal, subtitle }) {
  const info = PORTAL_INFO[portal] || {
    title: 'Módulo en construcción',
    emoji: '🚧',
    description: 'Esta sección está en construcción.',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSfycLogo portal={info.title} />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg text-center">
          <div className="text-6xl mb-4">{info.emoji}</div>
          <h1 className="text-2xl font-bold text-igss-800 mb-2">{info.title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mb-2">{subtitle}</p>}
          <p className="text-gray-700 mb-5">{info.description}</p>
          <Link
            to="/"
            className="inline-block bg-igss-700 hover:bg-igss-800 text-white font-semibold py-2 px-5 rounded-lg shadow"
          >
            ← Volver al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

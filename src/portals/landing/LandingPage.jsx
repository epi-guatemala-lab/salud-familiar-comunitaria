import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

const CARDS = [
  {
    to: '/satisfaccion',
    emoji: '📋',
    titulo: 'Encuesta de satisfacción',
    descripcion:
      'Formulario de retroalimentación sobre la atención brindada en la clínica de Salud Familiar y Comunitaria.',
    cta: 'Ir a la encuesta',
    color: 'border-igss-700 hover:bg-igss-50',
    public: true,
  },
  {
    to: '/docentes/login',
    emoji: '👨‍⚕️',
    titulo: 'Soy docente',
    descripcion:
      'Acceder al portal docente para evaluaciones, examenes y seguimiento de residentes.',
    cta: 'Iniciar sesion docente',
    color: 'border-igss-gold hover:bg-yellow-50',
  },
  {
    to: '/estudiantes/login',
    emoji: '🎓',
    titulo: 'Soy estudiante / residente',
    descripcion:
      'Acceder a mis examenes, calificaciones y boleta de notas.',
    cta: 'Iniciar sesion residente',
    color: 'border-igss-red hover:bg-red-50',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-igss-50">
      <Header showSfycLogo />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-igss-800 mb-2">
            Salud Familiar y Comunitaria
          </h1>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Plataforma del IGSS para la Estrategia de Salud Familiar y Comunitaria. Seleccione la
            opcion que corresponde a su rol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className={`block bg-white rounded-lg shadow border-l-4 p-6 transition transform hover:-translate-y-1 hover:shadow-lg ${c.color}`}
            >
              <div className="text-5xl mb-3" aria-hidden="true">
                {c.emoji}
              </div>
              <h2 className="text-xl font-bold text-igss-800 mb-2">{c.titulo}</h2>
              <p className="text-sm text-gray-600 mb-4 min-h-[3.5rem]">{c.descripcion}</p>
              <span className="inline-block text-sm font-semibold text-igss-700">
                {c.cta} →
              </span>
              {c.public && (
                <span className="ml-2 inline-block text-xs bg-igss-100 text-igss-800 px-2 py-0.5 rounded-full">
                  Sin login
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">
          <p>
            Si tiene problemas para acceder, contacte al administrador del sistema o a la
            Direccion de Epidemiologia del IGSS.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

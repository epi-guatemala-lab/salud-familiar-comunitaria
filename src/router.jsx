import { createBrowserRouter, Navigate } from 'react-router-dom';
import { BASE_URL } from './config/env';
import LandingPage from './portals/landing/LandingPage';

// Portal 1 — Satisfacción (público)
import SatisfaccionPage from './portals/satisfaccion/SatisfaccionPage';
import SatisfaccionThanks from './portals/satisfaccion/SatisfaccionThanks';

// Portal 2 — Docentes
import DocenteLogin from './portals/docentes/DocenteLogin';
import DocenteLayout from './portals/docentes/DocenteLayout';
import DocenteDashboard from './portals/docentes/DocenteDashboard';
import ResidentesList from './portals/docentes/ResidentesList';
import ResidentePerfil from './portals/docentes/ResidentePerfil';
import EvaluacionNueva from './portals/docentes/EvaluacionNueva';
import EvaluacionLlenado from './portals/docentes/EvaluacionLlenado';
import EvaluacionDetalleDoc from './portals/docentes/EvaluacionDetalle';
import ExamenesList from './portals/docentes/ExamenesList';
import ExamenCrear from './portals/docentes/ExamenCrear';
import ExamenIntentos from './portals/docentes/ExamenIntentos';
import IntentoDetalle from './portals/docentes/IntentoDetalle';
import PreguntasBanco from './portals/docentes/PreguntasBanco';
import RespuestasAbiertas from './portals/docentes/RespuestasAbiertas';

// Portal 3 — Estudiantes
import EstudianteLogin from './portals/estudiantes/EstudianteLogin';
import EstudianteLayout from './portals/estudiantes/EstudianteLayout';
import EstudianteDashboard from './portals/estudiantes/EstudianteDashboard';
import ExamenesActivos from './portals/estudiantes/ExamenesActivos';
import ExamenLanding from './portals/estudiantes/ExamenLanding';
import ExamenRunner from './portals/estudiantes/ExamenRunner';
import ExamenResumen from './portals/estudiantes/ExamenResumen';
import Calificaciones from './portals/estudiantes/Calificaciones';
import EvaluacionDetalleEst from './portals/estudiantes/EvaluacionDetalle';
import Calendario from './portals/estudiantes/Calendario';
import Boleta from './portals/estudiantes/Boleta';

// Layout
import ProtectedRoute from './components/layout/ProtectedRoute';
import NotFound from './components/layout/NotFound';

const router = createBrowserRouter(
  [
    { path: '/', element: <LandingPage /> },

    // Portal 1 — Satisfacción (público)
    { path: '/satisfaccion', element: <SatisfaccionPage /> },
    { path: '/satisfaccion/gracias', element: <SatisfaccionThanks /> },

    // Portal 2 — Docentes (JWT)
    { path: '/docentes/login', element: <DocenteLogin /> },
    {
      path: '/docentes',
      element: (
        <ProtectedRoute requiredRole="docente">
          <DocenteLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <DocenteDashboard /> },
        { path: 'residentes', element: <ResidentesList /> },
        { path: 'residentes/:id', element: <ResidentePerfil /> },
        { path: 'evaluaciones/nueva', element: <EvaluacionNueva /> },
        { path: 'evaluaciones/:id', element: <EvaluacionLlenado /> },
        { path: 'evaluaciones/:id/detalle', element: <EvaluacionDetalleDoc /> },
        { path: 'examenes', element: <ExamenesList /> },
        { path: 'examenes/nuevo', element: <ExamenCrear /> },
        // /docentes/examenes/:id antes 404 (NO había ruta detail). Ahora
        // redirige a la vista de intentos del examen, que es la única vista
        // funcional individual.
        { path: 'examenes/:id', element: <Navigate to="intentos" replace /> },
        { path: 'examenes/:id/intentos', element: <ExamenIntentos /> },
        { path: 'intentos/:id', element: <IntentoDetalle /> },
        { path: 'preguntas', element: <PreguntasBanco /> },
        { path: 'respuestas-abiertas', element: <RespuestasAbiertas /> },
      ],
    },

    // Portal 3 — Estudiantes (JWT)
    { path: '/estudiantes/login', element: <EstudianteLogin /> },
    {
      path: '/estudiantes',
      element: (
        <ProtectedRoute requiredRole="estudiante">
          <EstudianteLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <EstudianteDashboard /> },
        { path: 'examenes', element: <ExamenesActivos /> },
        { path: 'examenes/:id', element: <ExamenLanding /> },
        { path: 'examenes/:id/runner', element: <ExamenRunner /> },
        { path: 'examenes/:id/resumen', element: <ExamenResumen /> },
        { path: 'intentos/:intentoId/resumen', element: <ExamenResumen /> },
        { path: 'calificaciones', element: <Calificaciones /> },
        { path: 'calificaciones/examen/:intentoId', element: <ExamenResumen /> },
        { path: 'calificaciones/evaluacion/:id', element: <EvaluacionDetalleEst /> },
        { path: 'evaluaciones/:id', element: <EvaluacionDetalleEst /> },
        { path: 'calendario', element: <Calendario /> },
        { path: 'boleta', element: <Boleta /> },
      ],
    },

    { path: '*', element: <NotFound /> },
  ],
  { basename: BASE_URL }
);

export default router;

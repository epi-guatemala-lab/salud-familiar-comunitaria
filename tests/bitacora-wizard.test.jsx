import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../src/contexts/AuthContext';
import { ToastProvider } from '../src/contexts/ToastContext';
import { StepNavigation } from '../src/portals/bitacora/components/WizardSteps';
import ActivityWizardPage from '../src/portals/bitacora/pages/ActivityWizardPage';
import { bitacoraApi } from '../src/portals/bitacora/api';

function renderWizard(initialEntry = '/bitacora/actividades/nueva') {
  const auth = {
    isAuthenticated: true,
    user: {
      id: 1,
      rol: 'personal',
      roles: ['bitacora.asistente'],
      permissions: [
        'bitacora.read',
        'bitacora.create',
        'bitacora.edit',
        'bitacora.schedule',
        'bitacora.participants.manage',
        'bitacora.submit',
      ],
    },
  };
  const router = createMemoryRouter(
    [
      { path: '/bitacora/actividades/nueva', element: <ActivityWizardPage /> },
      { path: '/bitacora/actividades/:id', element: <ActivityWizardPage /> },
      { path: '/bitacora/actividades', element: <div>Listado de actividades</div> },
    ],
    { initialEntries: [initialEntry] }
  );
  return render(
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ToastProvider>
    </AuthContext.Provider>
  );
}

describe('wizard de Bitácora', () => {
  beforeEach(() => {
    vi.spyOn(bitacoraApi, 'listPeople').mockResolvedValue({
      items: [{
        id: 7,
        username: 'persona.interna',
        nombre: 'Persona Interna',
        unidad: 'SFYC',
        roles: ['bitacora.asistente'],
      }],
      total: 1,
      page: 1,
      limit: 50,
    });
    vi.spyOn(bitacoraApi, 'listCatalogValues').mockImplementation((key) => Promise.resolve({
      items: key === 'tipo_actividad'
        ? [{ id: 2, clave: 'TALLER', nombre: 'Taller institucional' }]
        : [{ id: 9, clave: 'COMUNITARIA', nombre: 'Comunitaria' }],
      total: 1,
      page: 1,
      limit: 500,
    }));
    vi.spyOn(bitacoraApi, 'getConfiguration').mockResolvedValue({
      etiquetas: [{ id: 3, nombre: 'Territorial', color: '#00529B' }],
      campos_personalizados: [{
        id: 8,
        clave: 'cobertura',
        nombre: 'Cobertura territorial',
        tipo: 'TEXT',
        requerido: true,
        opciones: [],
      }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bloquea el cambio de paso mientras un borrador se está guardando', () => {
    const onSelect = vi.fn();
    render(<StepNavigation current={2} onSelect={onSelect} disabled />);

    const navigation = screen.getByRole('navigation', { name: 'Pasos de la actividad' });
    expect(navigation).toHaveAttribute('aria-busy', 'true');
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('muestra los seis pasos y el indicador de faltantes', async () => {
    renderWizard();
    await screen.findByRole('option', { name: 'Taller institucional' });
    expect(screen.getByRole('heading', { name: 'Nueva actividad' })).toBeInTheDocument();
    for (const step of ['Programación', 'Participantes', 'Informe', 'Acuerdos', 'Evidencias', 'Revisión']) {
      expect(screen.getByRole('button', { name: new RegExp(step) })).toBeInTheDocument();
    }
    expect(screen.getByText(/faltantes/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Título *')).toBeInTheDocument();
  });

  it('carga catálogos nominales y evita pedir IDs manuales', async () => {
    renderWizard();
    expect(await screen.findByRole('option', { name: 'Taller institucional' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Comunitaria' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cobertura territorial *')).toBeInTheDocument();
    expect(screen.getByLabelText('Territorial')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Participantes/ }));
    expect(await screen.findByRole('option', { name: /Persona Interna.*persona\.interna.*SFYC/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Cuenta institucional (opcional)')).toBeInTheDocument();
    expect(screen.queryByLabelText(/ID de cuenta/i)).not.toBeInTheDocument();
  });

  it('advierte antes de cambiar de paso con datos sin guardar', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWizard();
    await screen.findByRole('option', { name: 'Taller institucional' });
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Cambio local' } });

    fireEvent.click(screen.getByRole('button', { name: /Participantes/ }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: '1. Programación' })).toBeInTheDocument();
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Participantes/ }));
    expect(screen.getByRole('heading', { name: '2. Participantes' })).toBeInTheDocument();
  });

  it('presenta a Secretaría el detalle completo y la última devolución', async () => {
    vi.spyOn(bitacoraApi, 'getActivity').mockResolvedValue({
      id: 41,
      titulo: 'Actividad devuelta',
      objetivo: 'Coordinar la jornada territorial.',
      tipo: 'Taller',
      modalidad: 'PRESENCIAL',
      unidad_lugar: 'Unidad Central',
      organizador: 'Equipo SFyC',
      inicio_utc: '2026-07-23T15:00:00Z',
      fin_utc: '2026-07-23T16:00:00Z',
      estado_programacion: 'REALIZADA',
      estado_documentacion: 'REQUIERE_CORRECCION',
      created_at: '2026-07-21T20:58:27.790Z',
      ultima_devolucion: {
        observaciones: 'Ampliar el aprendizaje documentado.',
        created_at: '2026-07-22T14:30:00Z',
        usuario_nombre: 'Teresa',
      },
      participantes: [{ id: 1, nombre: 'Participante prueba', funcion: 'Enlace', asistio: true }],
      informe: {
        actor_involucrado: 'Equipo territorial',
        que_ocurrio: 'Se realizó la actividad planificada.',
        evidencia_disponible: 'Minuta institucional',
        dificultades: 'Sin dificultades',
        solucion: 'No requerida',
        aprendizaje: 'Aprendizaje inicial',
      },
      acuerdos: [{
        id: 7,
        descripcion: 'Dar seguimiento territorial.',
        responsables: [{ nombre: 'Responsable prueba' }],
        vencimiento_at: '2026-07-30T15:00:00Z',
        prioridad: 'MEDIA',
        estado: 'PENDIENTE',
      }],
      evidencias: [{ id: 8, nombre_original: 'minuta_prueba.pdf', tamano_bytes: 2048, estado: 'DISPONIBLE' }],
      recurrencia: { enabled: false },
      version: 2,
    });

    renderWizard('/bitacora/actividades/41');
    await screen.findByText(/Último guardado:/);
    fireEvent.click(screen.getByRole('button', { name: /Revisión/ }));

    expect(screen.getByRole('heading', { name: 'Corrección solicitada por Secretaría' })).toBeInTheDocument();
    expect(screen.getByText('Ampliar el aprendizaje documentado.')).toBeInTheDocument();
    expect(screen.getByText('Coordinar la jornada territorial.')).toBeInTheDocument();
    expect(screen.getByText('Participante prueba')).toBeInTheDocument();
    expect(screen.getByText('Se realizó la actividad planificada.')).toBeInTheDocument();
    expect(screen.getByText('Dar seguimiento territorial.')).toBeInTheDocument();
    expect(screen.getByText('Responsable prueba')).toBeInTheDocument();
    expect(screen.getByText('minuta_prueba.pdf')).toBeInTheDocument();
  });

  it('conserva el indicador de último guardado al cargar la URL persistida', async () => {
    vi.spyOn(bitacoraApi, 'getActivity').mockResolvedValue({
      id: 41,
      titulo: 'Actividad persistida',
      estado_programacion: 'BORRADOR',
      estado_documentacion: 'NO_INICIADA',
      created_at: '2026-07-21T20:58:27.790Z',
      participantes: [],
      acuerdos: [],
      evidencias: [],
      recurrencia: { enabled: false },
      version: 1,
    });
    vi.spyOn(bitacoraApi, 'listAgreements').mockResolvedValue({
      items: [], total: 0, page: 1, limit: 200,
    });
    vi.spyOn(bitacoraApi, 'listEvidence').mockResolvedValue({
      items: [], total: 0, page: 1, limit: 200,
    });

    renderWizard('/bitacora/actividades/41');

    expect(await screen.findByText(/Último guardado:/)).toBeInTheDocument();
    expect(screen.queryByText('Los borradores se guardan en el servidor')).not.toBeInTheDocument();
  });
});

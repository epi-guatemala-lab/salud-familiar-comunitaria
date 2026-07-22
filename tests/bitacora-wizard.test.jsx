import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  return render(
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <MemoryRouter
          initialEntries={[initialEntry]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/bitacora/actividades/nueva" element={<ActivityWizardPage />} />
            <Route path="/bitacora/actividades/:id" element={<ActivityWizardPage />} />
          </Routes>
        </MemoryRouter>
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

  it('muestra los seis pasos, faltantes y advertencia de datos de pacientes', async () => {
    renderWizard();
    await screen.findByRole('option', { name: 'Taller institucional' });
    expect(screen.getByRole('heading', { name: 'Nueva actividad' })).toBeInTheDocument();
    for (const step of ['Programación', 'Participantes', 'Informe', 'Acuerdos', 'Evidencias', 'Revisión']) {
      expect(screen.getByRole('button', { name: new RegExp(step) })).toBeInTheDocument();
    }
    expect(screen.getByText(/No ingrese nombres, números de afiliación, DPI/i)).toBeInTheDocument();
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

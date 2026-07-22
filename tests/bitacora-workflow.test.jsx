import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/contexts/ToastContext';
import WorkflowActions from '../src/portals/bitacora/components/WorkflowActions';
import { bitacoraApi } from '../src/portals/bitacora/api';

const secretary = {
  rol: 'personal',
  roles: ['bitacora.secretaria'],
  permissions: ['bitacora.read', 'bitacora.review'],
};

const assistant = {
  rol: 'personal',
  roles: ['bitacora.asistente'],
  permissions: ['bitacora.read', 'bitacora.submit'],
};

function renderActions(user) {
  const onArchived = vi.fn();
  render(
    <ToastProvider>
      <WorkflowActions
        activity={{
          id: 91,
          version: 4,
          estado_programacion: 'REALIZADA',
          estado_documentacion: 'COMPLETA',
          permissions: ['bitacora.archivar'],
        }}
        user={user}
        onArchived={onArchived}
      />
    </ToastProvider>
  );
  return onArchived;
}

describe('acciones documentales de Bitácora', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('solo permite a Secretaría archivar con motivo, versión e idempotencia', async () => {
    const response = {
      ok: true,
      id: 91,
      archivada: true,
      archivada_at: '2026-07-22T15:00:00Z',
      version: 5,
    };
    const action = vi.spyOn(bitacoraApi, 'action').mockResolvedValue(response);
    const onArchived = renderActions(secretary);

    fireEvent.click(screen.getByRole('button', { name: 'Archivar actividad' }));
    const dialog = screen.getByRole('dialog', { name: 'Archivar actividad' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Motivo *'), { target: { value: 'x' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Motivo *'), {
      target: { value: 'Cierre administrativo verificado.' },
    });
    fireEvent.click(confirm);

    await waitFor(() => expect(action).toHaveBeenCalledWith(
      91,
      'archivar',
      {
        motivo: 'Cierre administrativo verificado.',
        observaciones: 'Cierre administrativo verificado.',
      },
      expect.objectContaining({
        version: 4,
        idempotencyKey: expect.stringMatching(/^archivar-/),
      })
    ));
    await waitFor(() => expect(onArchived).toHaveBeenCalledWith(response));
  });

  it('no muestra Archivar actividad a asistentes aunque venga el permiso explícito', () => {
    renderActions(assistant);
    expect(screen.queryByRole('button', { name: 'Archivar actividad' })).not.toBeInTheDocument();
  });
});

import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Modal from '../src/components/ui/Modal';

function ModalHarness({ onClosed = () => {} }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onClosed();
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir revisión</button>
      <Modal
        open={open}
        title="Confirmar revisión"
        onClose={close}
        footer={<button type="button">Confirmar</button>}
      >
        <input aria-label="Observaciones" />
      </Modal>
    </>
  );
}

describe('Modal accesible', () => {
  it('tiene nombre accesible, enfoca su primer control y encierra Tab', async () => {
    render(<ModalHarness />);
    const opener = screen.getByRole('button', { name: 'Abrir revisión' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Confirmar revisión' });
    const close = screen.getByRole('button', { name: 'Cerrar' });
    const confirm = screen.getByRole('button', { name: 'Confirmar' });
    await waitFor(() => expect(close).toHaveFocus());

    confirm.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('cierra con Escape y restaura el foco al disparador', async () => {
    const onClosed = vi.fn();
    render(<ModalHarness onClosed={onClosed} />);
    const opener = screen.getByRole('button', { name: 'Abrir revisión' });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole('dialog', { name: 'Confirmar revisión' });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onClosed).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
  });
});

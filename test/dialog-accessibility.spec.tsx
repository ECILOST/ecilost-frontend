import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Dialog } from '@/shared/components/ui/dialog';

it('keeps content clicks inside the dialog and closes through the native backdrop button', async () => {
  const close = vi.fn();
  render(<Dialog open title="Confirmación" onClose={close}><button type="button">Contenido</button></Dialog>);
  await userEvent.click(screen.getByRole('button', { name: 'Contenido' }));
  expect(close).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }));
  expect(close).toHaveBeenCalledOnce();
});

it('supports keyboard activation on the backdrop and Escape inside the dialog', async () => {
  const close = vi.fn();
  render(<Dialog open title="Confirmación" onClose={close}>Contenido</Dialog>);
  screen.getByRole('button', { name: 'Cerrar diálogo' }).focus();
  await userEvent.keyboard('{Enter}');
  expect(close).toHaveBeenCalledOnce();
  screen.getByRole('dialog', { name: 'Confirmación' }).focus();
  await userEvent.keyboard('{Escape}');
  expect(close).toHaveBeenCalledTimes(2);
});

it('focuses the named dialog on opening and returns focus when closed', async () => {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const close = vi.fn();
  const { rerender } = render(<Dialog open title="Confirmación" onClose={close}>Contenido</Dialog>);
  expect(screen.getByRole('dialog', { name: 'Confirmación' })).toHaveFocus();
  rerender(<Dialog open={false} title="Confirmación" onClose={close}>Contenido</Dialog>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  trigger.remove();
});

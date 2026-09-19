import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Field, Input } from '@/shared/components/ui/field';

/**
 * Las piezas que sostienen los formularios y los borrados. Se prueban sueltas porque su
 * valor esta en el cableado accesible, que no se ve en la pantalla: una etiqueta que no
 * apunta a su control se pinta exactamente igual que una que si.
 */

describe('Field', () => {
  it('enlaza la etiqueta, la ayuda y el error con el control', () => {
    render(
      <Field
        label="Categoría"
        hint="Sirve para armar rondas por tipo"
        error="category es obligatorio"
        required
      >
        <Input value="" onChange={() => {}} />
      </Field>,
    );

    // Encontrarlo por su etiqueta ya demuestra que `htmlFor` y el `id` coinciden.
    const control = screen.getByLabelText(/categoría/i);

    expect(control).toBeRequired();
    expect(control).toHaveAccessibleDescription(
      'Sirve para armar rondas por tipo category es obligatorio',
    );
    expect(control).toHaveAttribute('aria-invalid', 'true');
  });

  it('sin error no marca el control como invalido', () => {
    render(
      <Field label="Nombre">
        <Input value="" onChange={() => {}} />
      </Field>,
    );

    expect(screen.getByLabelText('Nombre')).not.toHaveAttribute('aria-invalid');
  });
});

describe('ConfirmDialog', () => {
  const props = {
    title: 'Borrar el objeto',
    confirmLabel: 'Borrar',
    onConfirm: () => {},
    onCancel: () => {},
  };

  it('no esta en pantalla mientras no se abre', () => {
    render(<ConfirmDialog {...props} open={false} />);

    expect(
      screen.queryByRole('dialog', { name: 'Borrar el objeto' }),
    ).not.toBeInTheDocument();
  });

  it('se abre como dialogo modal, con nombre propio', () => {
    render(<ConfirmDialog {...props} open />);

    expect(
      screen.getByRole('dialog', { name: 'Borrar el objeto' }),
    ).toBeVisible();
  });

  it('confirmar y cancelar avisan hacia arriba, cada uno por su lado', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog {...props} open onConfirm={onConfirm} onCancel={onCancel} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('mientras la operacion va en marcha no se puede pulsar dos veces', () => {
    render(<ConfirmDialog {...props} open busy />);

    expect(screen.getByRole('button', { name: /un momento/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});

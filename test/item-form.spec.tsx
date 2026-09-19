import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ItemCondition } from '@/features/catalog/domain/item-condition';
import type { CreateItemRequest } from '@/features/catalog/model/item';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import {
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeItemGateway,
  createTestContainer,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/** Rellena el formulario entero. Devuelve lo que se escribio, para comprobarlo despues. */
async function fill(overrides: Partial<CreateItemRequest> = {}) {
  const values = {
    name: 'Termo Stanley verde',
    description: 'Con una abolladura en la base y una calcomanía de montaña.',
    category: 'Accesorios',
    ...overrides,
  };

  await userEvent.type(screen.getByLabelText(/nombre/i), values.name);
  await userEvent.type(screen.getByLabelText(/descripción/i), values.description);
  await userEvent.type(screen.getByLabelText(/categoría/i), values.category);
  return values;
}

describe('Registrar objeto', () => {
  it('manda al servicio lo que se escribio y lleva a la ficha del objeto nuevo', async () => {
    const created: CreateItemRequest[] = [];
    const container = createTestContainer({
      auth: createFakeAuthGateway(STAFF),
      items: createFakeItemGateway({ created }),
    });

    renderApp({ route: '/items/nuevo', container });
    await screen.findByRole('heading', { name: 'Registrar objeto' });

    const values = await fill();
    await userEvent.selectOptions(
      screen.getByLabelText(/estado físico/i),
      'DAMAGED',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar objeto' }),
    );

    expect(created).toEqual([{ ...values, condition: ItemCondition.DAMAGED }]);

    // Aterriza en la ficha del objeto nuevo, y alli el aviso confirma que lo que se esta
    // viendo es lo que se acaba de guardar. La navegacion sola no lo dice: "estoy en una
    // ficha" no distingue entre que se guardo y que se volvio sin guardar.
    expect(
      await screen.findByRole('heading', { name: values.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(/quedó registrado/i)).toBeInTheDocument();
  });

  it('recorta los espacios antes de enviar, como hace el servicio', async () => {
    const created: CreateItemRequest[] = [];
    const container = createTestContainer({
      auth: createFakeAuthGateway(STAFF),
      items: createFakeItemGateway({ created }),
    });

    renderApp({ route: '/items/nuevo', container });
    await screen.findByRole('heading', { name: 'Registrar objeto' });

    await fill({ name: '   Termo Stanley verde   ' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar objeto' }),
    );

    expect(created[0]?.name).toBe('Termo Stanley verde');
  });

  it('no sale a la red con campos vacios y dice cuales faltan', async () => {
    const created: CreateItemRequest[] = [];
    const container = createTestContainer({
      auth: createFakeAuthGateway(STAFF),
      items: createFakeItemGateway({ created }),
    });

    renderApp({ route: '/items/nuevo', container });
    await screen.findByRole('heading', { name: 'Registrar objeto' });

    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar objeto' }),
    );

    expect(created).toHaveLength(0);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /faltan datos obligatorios/i,
    );
    // Y el mensaje tambien esta enlazado con su casilla, no solo en el resumen de arriba.
    expect(screen.getByLabelText(/nombre/i)).toHaveAccessibleDescription(
      /escribe el nombre del objeto/i,
    );
  });

  it('coloca debajo de su campo el error que devuelve el servicio', async () => {
    const container = createTestContainer({
      auth: createFakeAuthGateway(STAFF),
      items: createFakeItemGateway({
        rejects: {
          create: new ApiError({
            type: ProblemType.VALIDATION,
            title: 'La peticion no es valida',
            status: 400,
            detail: 'Uno o mas campos no cumplen el contrato.',
            errors: ['category es obligatorio'],
          }),
        },
      }),
    });

    renderApp({ route: '/items/nuevo', container });
    await screen.findByRole('heading', { name: 'Registrar objeto' });

    await fill();
    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar objeto' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no es valida/i,
    );
    expect(screen.getByLabelText(/categoría/i)).toHaveAccessibleDescription(
      /category es obligatorio/i,
    );
  });

  it('al estudiante no le deja ni abrir el formulario', async () => {
    const container = createTestContainer({
      auth: createFakeAuthGateway(STUDENT),
    });

    renderApp({ route: '/items/nuevo', container });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no tienes permiso/i,
    );
    expect(
      screen.queryByRole('button', { name: 'Registrar objeto' }),
    ).not.toBeInTheDocument();
  });

  it('el catalogo solo ofrece registrar a quien administra', async () => {
    const staff = createTestContainer({
      auth: createFakeAuthGateway(STAFF),
      items: createFakeItemGateway({ items: [] }),
    });
    const { unmount } = renderApp({ route: '/items', container: staff });
    expect(
      await screen.findByRole('link', { name: /registrar objeto/i }),
    ).toBeInTheDocument();
    unmount();

    const student = createTestContainer({
      auth: createFakeAuthGateway(STUDENT),
      items: createFakeItemGateway({ items: [] }),
    });
    renderApp({ route: '/items', container: student });
    await screen.findByRole('heading', { name: 'Catálogo' });
    expect(
      screen.queryByRole('link', { name: /registrar objeto/i }),
    ).not.toBeInTheDocument();
  });
});

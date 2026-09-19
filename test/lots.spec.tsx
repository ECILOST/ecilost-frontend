import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CreateLotRequest } from '@/features/lots/model/lot';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import {
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeItemGateway,
  createFakeLotGateway,
  createTestContainer,
  detailFixture,
  itemFixture,
  lotFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Lotes (HU-05 y HU-06).
 *
 * Lo que hay que probar de la creacion no es el formulario, es el contrato: dos objetos como
 * minimo, y que un 409 signifique que no se creo nada, porque el servicio lo resuelve en una
 * sola transaccion.
 */

const AVAILABLE = [
  itemFixture({ id: 'item-1', name: 'Portatil Lenovo' }),
  itemFixture({ id: 'item-2', name: 'Audifonos Sony' }),
];

function staff(overrides: Parameters<typeof createTestContainer>[0] = {}) {
  return createTestContainer({
    auth: createFakeAuthGateway(STAFF),
    items: createFakeItemGateway({ items: AVAILABLE }),
    ...overrides,
  });
}

describe('Lotes', () => {
  it('el listado enseña que lleva dentro cada lote, no solo cuantos', async () => {
    renderApp({
      route: '/lots',
      container: staff({ lots: createFakeLotGateway({ lots: [lotFixture()] }) }),
    });

    expect(
      await screen.findByRole('heading', {
        name: 'Kit de electronica extraviada',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Portatil Lenovo ThinkPad · Audifonos Sony/),
    ).toBeInTheDocument();
  });

  it('no deja crear un lote de uno solo', async () => {
    renderApp({ route: '/lots/nuevo', container: staff() });

    await userEvent.type(
      await screen.findByLabelText(/nombre del lote/i),
      'Kit de electrónica',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /portatil/i }));

    expect(screen.getByRole('button', { name: 'Crear lote' })).toBeDisabled();
    expect(screen.getByText(/elige al menos 2 objetos/i)).toBeInTheDocument();
  });

  it('crea el lote con los objetos elegidos y lleva a su ficha', async () => {
    const created: CreateLotRequest[] = [];
    renderApp({
      route: '/lots/nuevo',
      container: staff({ lots: createFakeLotGateway({ created }) }),
    });

    await userEvent.type(
      await screen.findByLabelText(/nombre del lote/i),
      'Kit de electrónica',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /portatil/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /audifonos/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear lote' }));

    // Antes de escribir nada se confirma, y el dialogo nombra los objetos que se van a
    // reservar: es irreversible y no hay forma de sacarlos despues.
    const dialog = await screen.findByRole('dialog', {
      name: /¿armar el lote con 2 objetos\?/i,
    });
    expect(dialog).toHaveTextContent(/Portatil Lenovo, Audifonos Sony/);
    expect(created).toEqual([]);

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Crear el lote' }),
    );

    expect(created).toEqual([
      { name: 'Kit de electrónica', itemIds: ['item-1', 'item-2'] },
    ]);
    expect(await screen.findByText(/quedó armado/i)).toBeInTheDocument();
  });

  it('un 409 significa que no se creo nada, y asi se cuenta', async () => {
    const container = staff({
      lots: createFakeLotGateway({
        rejects: {
          create: new ApiError({
            type: ProblemType.LOT_EXCLUSIVITY,
            title: 'Objeto ya asignado a un lote',
            status: 409,
          }),
        },
      }),
    });
    renderApp({ route: '/lots/nuevo', container });

    await userEvent.type(
      await screen.findByLabelText(/nombre del lote/i),
      'Kit de electrónica',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /portatil/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: /audifonos/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear lote' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Crear el lote' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/dejó de estar disponible/i);
    expect(alert).toHaveTextContent(/el lote no se creó/i);
  });

  it('al estudiante le deja mirar los lotes pero no armarlos', async () => {
    const container = createTestContainer({
      auth: createFakeAuthGateway(STUDENT),
      lots: createFakeLotGateway({ lots: [lotFixture()] }),
    });
    renderApp({ route: '/lots', container });

    await screen.findByRole('heading', { name: 'Lotes' });
    expect(
      screen.queryByRole('link', { name: /crear lote/i }),
    ).not.toBeInTheDocument();
  });

  it('la ficha de un objeto en lote lleva a su lote', async () => {
    const container = createTestContainer({
      auth: createFakeAuthGateway(STAFF),
      items: createFakeItemGateway({
        views: {
          'item-1': detailFixture({ lotId: 'lot-1', status: 'IN_LOT' }),
        },
      }),
      lots: createFakeLotGateway({ lots: [lotFixture()] }),
    });
    renderApp({ route: '/items/item-1', container });

    expect(
      await screen.findByRole('link', { name: 'Kit de electronica extraviada' }),
    ).toHaveAttribute('href', '/lots/lot-1');
  });
});

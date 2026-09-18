import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ItemStatus } from '@/features/catalog/domain/item-status';
import type { ListItemsQuery } from '@/features/catalog/model/item';
import {
  createFakeAuthGateway,
  createFakeItemGateway,
  createTestContainer,
  itemFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

describe('Catalogo', () => {
  it('muestra los objetos que devuelve el servicio', async () => {
    const container = createTestContainer({
      items: createFakeItemGateway({
        items: [
          itemFixture({ id: 'item-1', name: 'Portatil Lenovo' }),
          itemFixture({ id: 'item-2', name: 'Termo azul' }),
        ],
      }),
    });

    renderApp({ route: '/items', container });

    expect(await screen.findByText('Portatil Lenovo')).toBeInTheDocument();
    expect(screen.getByText('Termo azul')).toBeInTheDocument();
  });

  it('avisa cuando no hay nada en vez de dejar la pantalla en blanco', async () => {
    renderApp({
      route: '/items',
      container: createTestContainer({
        items: createFakeItemGateway({ items: [] }),
      }),
    });

    expect(
      await screen.findByText(/no hay objetos con ese filtro/i),
    ).toBeInTheDocument();
  });

  it('pide al servicio el filtro de estado elegido', async () => {
    const calls: ListItemsQuery[] = [];
    const container = createTestContainer({
      items: createFakeItemGateway({
        items: [
          itemFixture({ id: 'item-1', name: 'Portatil Lenovo' }),
          itemFixture({
            id: 'item-2',
            name: 'Termo vendido',
            status: ItemStatus.SOLD,
          }),
        ],
        calls,
      }),
    });

    renderApp({ route: '/items', container });
    await screen.findByText('Portatil Lenovo');

    // El filtro son botones de radio de verdad, aunque se vean como capsulas.
    await userEvent.click(screen.getByRole('radio', { name: 'Vendido' }));

    expect(await screen.findByText('Termo vendido')).toBeInTheDocument();
    expect(screen.queryByText('Portatil Lenovo')).not.toBeInTheDocument();
    // El filtro se resuelve en el servicio, no recortando la lista ya traida.
    expect(calls.at(-1)).toEqual({ status: ItemStatus.SOLD });
  });

  it('manda a login a quien no tiene sesion, en vez de mostrar el catalogo vacio', async () => {
    const container = createTestContainer({
      auth: createFakeAuthGateway(null),
    });

    renderApp({ route: '/items', container });

    expect(
      await screen.findByRole('button', { name: /entrar con google/i }),
    ).toBeInTheDocument();
  });
});

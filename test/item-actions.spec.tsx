import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ItemStatus } from '@/features/catalog/domain/item-status';
import type { ItemDetail, UpdateItemRequest } from '@/features/catalog/model/item';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import {
  STAFF,
  createFakeAuthGateway,
  createFakeItemGateway,
  createTestContainer,
  detailFixture,
  type FakeCatalog,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Edicion, retirada y borrado (HU-04).
 *
 * Lo que se comprueba una y otra vez es la `version`: es lo que impide que dos funcionarios
 * editando la misma ficha se pisen en silencio, y por tanto lo unico que de verdad hace
 * falta que el front no pierda por el camino.
 */

function staffOn(item: ItemDetail, rest: FakeCatalog = {}) {
  return createTestContainer({
    auth: createFakeAuthGateway(STAFF),
    items: createFakeItemGateway({ views: { [item.id]: item }, ...rest }),
  });
}

describe('Acciones sobre un objeto', () => {
  it('guarda los cambios con la version que se leyo y vuelve a la ficha', async () => {
    const updated: { id: string; request: UpdateItemRequest }[] = [];
    const item = detailFixture({ version: 7 });
    renderApp({
      route: '/items/item-1/editar',
      container: staffOn(item, { updated }),
    });

    const name = await screen.findByLabelText(/nombre/i);
    await userEvent.clear(name);
    await userEvent.type(name, 'Portátil Lenovo ThinkPad T14');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(updated).toEqual([
      {
        id: 'item-1',
        request: {
          name: 'Portátil Lenovo ThinkPad T14',
          description: item.description,
          condition: item.condition,
          category: item.category,
          version: 7,
        },
      },
    ]);
    expect(
      await screen.findByText(/los cambios quedaron guardados/i),
    ).toBeInTheDocument();
  });

  it('ante un conflicto de version no reintenta a ciegas: ofrece cargar lo actual', async () => {
    const item = detailFixture({ version: 1 });
    const container = staffOn(item, {
      rejects: {
        update: new ApiError({
          type: ProblemType.VERSION_CONFLICT,
          title: 'El objeto cambio desde que lo leiste',
          status: 409,
        }),
      },
    });
    renderApp({ route: '/items/item-1/editar', container });

    await screen.findByLabelText(/nombre/i);
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /otra persona editó este objeto/i,
    );
    expect(
      screen.getByRole('button', { name: /cargar la versión actual/i }),
    ).toBeInTheDocument();
  });

  it('retirar es una transicion de estado, no un borrado', async () => {
    const updated: { id: string; request: UpdateItemRequest }[] = [];
    const item = detailFixture({ version: 2, status: ItemStatus.AVAILABLE });
    renderApp({ route: '/items/item-1', container: staffOn(item, { updated }) });

    await userEvent.click(await screen.findByRole('button', { name: 'Retirar' }));

    expect(updated).toEqual([
      { id: 'item-1', request: { version: 2, status: ItemStatus.WITHDRAWN } },
    ]);
    expect(await screen.findByText(/quedó retirado/i)).toBeInTheDocument();
  });

  it('a un objeto retirado le ofrece reponerlo, que es la vuelta atras', async () => {
    const item = detailFixture({ status: ItemStatus.WITHDRAWN });
    renderApp({ route: '/items/item-1', container: staffOn(item) });

    expect(
      await screen.findByRole('button', { name: 'Reponer' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retirar' }),
    ).not.toBeInTheDocument();
  });

  it('no ofrece borrar lo que el servicio no dejaria borrar, y dice por que', async () => {
    const item = detailFixture({ status: ItemStatus.IN_ROUND });
    renderApp({ route: '/items/item-1', container: staffOn(item) });

    await screen.findByRole('heading', { name: 'Administración' });

    expect(
      screen.queryByRole('button', { name: 'Borrar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/comprometido en una ronda de subasta/i),
    ).toBeInTheDocument();
    // Editar los datos si se puede: el servicio solo mira el estado si se cambia el estado.
    expect(
      screen.getByRole('link', { name: /editar datos/i }),
    ).toBeInTheDocument();
  });

  it('borrar pide confirmacion, manda la version y vuelve al catalogo', async () => {
    const deleted: { id: string; version: number }[] = [];
    const item = detailFixture({ version: 4 });
    renderApp({ route: '/items/item-1', container: staffOn(item, { deleted }) });

    await userEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    const dialog = await screen.findByRole('dialog', {
      name: /¿borrar este objeto\?/i,
    });
    expect(deleted).toEqual([]);

    // Se busca dentro del dialogo: en el navegador `showModal` deja el resto de la pagina
    // inerte, pero en jsdom el boton de la ficha sigue ahi y los dos se llaman igual.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Borrar' }));

    expect(deleted).toEqual([{ id: 'item-1', version: 4 }]);
    expect(
      await screen.findByText(/se borró del catálogo/i),
    ).toBeInTheDocument();
  });
});

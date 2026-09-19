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

    // Sin filtros puestos, el catalogo esta vacio de verdad: culpar a un filtro que nadie
    // eligio mandaria a buscar un control que no existe.
    expect(
      await screen.findByText(/todavía no hay objetos en el catálogo/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /quitar los filtros/i }),
    ).not.toBeInTheDocument();
  });

  it('cuando el vacio lo causa un filtro, lo dice y ofrece quitarlo', async () => {
    const container = createTestContainer({
      items: createFakeItemGateway({
        items: [itemFixture({ id: 'item-1', status: ItemStatus.AVAILABLE })],
      }),
    });

    renderApp({ route: '/items', container });
    await screen.findByText('Portatil Lenovo ThinkPad');

    await userEvent.click(screen.getByRole('radio', { name: 'Vendido' }));

    expect(
      await screen.findByText(/no hay objetos con ese filtro/i),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /quitar los filtros/i }),
    );
    expect(
      await screen.findByText('Portatil Lenovo ThinkPad'),
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
    // El filtro se resuelve en el servicio, no recortando la lista ya traida. Se comprueba
    // solo el filtro: los parametros de pagina viajan siempre y no son lo que se prueba.
    expect(calls.at(-1)).toMatchObject({ status: ItemStatus.SOLD });
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

  it('no finge que la primera pagina es todo el catalogo: ofrece cargar mas', async () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      itemFixture({ id: `item-${index}`, name: `Objeto ${index}` }),
    );

    renderApp({
      route: '/items',
      container: createTestContainer({
        items: createFakeItemGateway({ items: many }),
      }),
    });

    // La primera pagina son 24, y el contador no las llama "24 objetos" porque no lo son.
    expect(await screen.findByText('Mostrando 24')).toBeInTheDocument();
    expect(screen.queryByText('Objeto 25')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));

    expect(await screen.findByText('Objeto 25')).toBeInTheDocument();
    // Ya no quedan: ahora si es un total, y el boton desaparece.
    expect(screen.getByText('30 objetos')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cargar más' }),
    ).not.toBeInTheDocument();
  });

  it('la tarjeta enseña la portada que firma el servicio, y el collage cuando no hay', async () => {
    const cover =
      'http://localhost:9000/ecilost-catalog-media/items/item-1/a1b2.png?X-Amz-Signature=x';
    const { container } = renderApp({
      route: '/items',
      container: createTestContainer({
        items: createFakeItemGateway({
          items: [
            itemFixture({ id: 'item-1', name: 'Con foto', coverUrl: cover }),
            itemFixture({ id: 'item-2', name: 'Sin foto' }),
          ],
        }),
      }),
    });

    await screen.findByText('Con foto');

    // Se busca en el DOM y no por rol porque la portada es decorativa: el nombre del objeto
    // va debajo en texto, y anunciarla ademas diria dos veces lo mismo.
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', cover);

    // El que todavia no tiene fotografia cae a su inicial, no a un hueco.
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('filtra por categoria con las que traen los objetos ya cargados', async () => {
    const calls: ListItemsQuery[] = [];
    const container = createTestContainer({
      items: createFakeItemGateway({
        calls,
        items: [
          itemFixture({ id: 'item-1', name: 'Termo', category: 'Accesorios' }),
          itemFixture({
            id: 'item-2',
            name: 'Portátil',
            category: 'Electrónica',
          }),
        ],
      }),
    });

    renderApp({ route: '/items', container });
    await screen.findByText('Termo');

    await userEvent.click(screen.getByRole('radio', { name: 'Electrónica' }));

    expect(await screen.findByText('Portátil')).toBeInTheDocument();
    expect(screen.queryByText('Termo')).not.toBeInTheDocument();
    expect(calls.at(-1)).toMatchObject({ category: 'Electrónica' });
  });
});

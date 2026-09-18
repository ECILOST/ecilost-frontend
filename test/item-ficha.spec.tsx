import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createFakeAuthGateway,
  createFakeItemGateway,
  createTestContainer,
  detailFixture,
  fichaFixture,
  photoFixture,
  STAFF,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * La ficha del objeto (HU-08). Lo que distingue a un rol de otro lo decide el servicio, y
 * estas pruebas comprueban que la pantalla se adapta a lo que llega en vez de asumirlo.
 */
describe('Ficha del objeto', () => {
  it('muestra la multimedia que trae la ficha', async () => {
    const container = createTestContainer({
      items: createFakeItemGateway({
        views: {
          'item-1': fichaFixture({
            photos: [photoFixture({ id: 'foto-1', position: 0 })],
            video: photoFixture({
              id: 'video-1',
              kind: 'VIDEO',
              contentType: 'video/mp4',
            }),
          }),
        },
      }),
    });

    renderApp({ route: '/items/item-1', container });

    expect(
      await screen.findByRole('img', { name: /fotografía 1 del objeto/i }),
    ).toBeInTheDocument();
  });

  it('no filtra por su cuenta: al estudiante no le llega la version y no la pinta', async () => {
    const container = createTestContainer({
      items: createFakeItemGateway({ views: { 'item-1': fichaFixture() } }),
    });

    renderApp({ route: '/items/item-1', container });
    await screen.findByText('Portatil Lenovo ThinkPad');

    expect(screen.queryByText('Versión')).not.toBeInTheDocument();
  });

  it('muestra la version cuando el servicio la manda, que es al funcionario', async () => {
    const container = createTestContainer({
      auth: createFakeAuthGateway(STAFF),
      items: createFakeItemGateway({
        views: { 'item-1': detailFixture({ version: 3 }) },
      }),
    });

    renderApp({ route: '/items/item-1', container });

    expect(await screen.findByText('Versión')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('explica el error del servicio cuando el objeto no existe', async () => {
    const container = createTestContainer({
      items: createFakeItemGateway({ views: {} }),
    });

    renderApp({ route: '/items/no-existe', container });

    expect(await screen.findByText('El objeto no existe')).toBeInTheDocument();
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ItemView } from '@/features/catalog/model/item';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import {
  STAFF,
  createFakeAuthGateway,
  createFakeItemGateway,
  createFakeMediaGateway,
  createTestContainer,
  detailFixture,
  photoFixture,
  type FakeMedia,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Subida y borrado de multimedia (HU-07).
 *
 * El endpoint acepta un archivo por peticion, asi que lo que hay que probar de "subir
 * varias" no es que se manden, sino que se mandan **una detras de otra** y que la tanda se
 * corta cuando seguir ya no puede salir bien.
 */

/** Un archivo con el peso que haga falta, sin reservar esos bytes de verdad. */
function fileOf(name: string, bytes = 1024, type = 'image/jpeg'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

function staffOnItem(media: FakeMedia = {}, view?: ItemView) {
  return createTestContainer({
    auth: createFakeAuthGateway(STAFF),
    items: createFakeItemGateway({
      views: { 'item-1': view ?? detailFixture({ photos: [], video: null }) },
    }),
    media: createFakeMediaGateway(media),
  });
}

async function openFicha() {
  await screen.findByRole('heading', { name: 'Multimedia' });
  return screen.getByLabelText(/añadir fotografías/i);
}

describe('Multimedia del objeto', () => {
  it('manda cada fotografia en su propia peticion, en el orden elegido', async () => {
    const uploaded: File[] = [];
    renderApp({ route: '/items/item-1', container: staffOnItem({ uploaded }) });

    const picker = await openFicha();
    await userEvent.upload(picker, [
      fileOf('frente.jpg'),
      fileOf('dorso.jpg'),
      fileOf('etiqueta.png', 1024, 'image/png'),
    ]);

    expect(uploaded.map((file) => file.name)).toEqual([
      'frente.jpg',
      'dorso.jpg',
      'etiqueta.png',
    ]);
    expect(
      await screen.findByText(/se adjuntaron 3 archivos/i),
    ).toBeInTheDocument();
  });

  it('descarta el que pesa de mas sin gastar la subida, y sigue con el resto', async () => {
    const uploaded: File[] = [];
    renderApp({ route: '/items/item-1', container: staffOnItem({ uploaded }) });

    const picker = await openFicha();
    await userEvent.upload(picker, [
      fileOf('enorme.jpg', 6 * 1024 * 1024),
      fileOf('normal.jpg'),
    ]);

    expect(uploaded.map((file) => file.name)).toEqual(['normal.jpg']);
    expect(
      await screen.findByText(/enorme\.jpg: pesa 6\.0 MB/i),
    ).toBeInTheDocument();
  });

  it('para en cuanto el objeto llega al tope en vez de insistir con los que quedan', async () => {
    const uploaded: File[] = [];
    const container = staffOnItem({
      uploaded,
      rejects: {
        'segunda.jpg': new ApiError({
          type: ProblemType.PHOTO_LIMIT_REACHED,
          title: 'El objeto llego al tope de fotografias',
          status: 409,
        }),
      },
    });
    renderApp({ route: '/items/item-1', container });

    const picker = await openFicha();
    await userEvent.upload(picker, [
      fileOf('primera.jpg'),
      fileOf('segunda.jpg'),
      fileOf('tercera.jpg'),
    ]);

    // La tercera no se llega a intentar: habria recibido el mismo 409.
    expect(uploaded.map((file) => file.name)).toEqual(['primera.jpg']);
    expect(await screen.findByText(/se detuvo ahí/i)).toBeInTheDocument();
    expect(
      screen.getByText(/segunda\.jpg: el objeto llegó al tope/i),
    ).toBeInTheDocument();
  });

  it('quitar una pieza pasa siempre por una confirmacion', async () => {
    const removed: string[] = [];
    const container = staffOnItem(
      { removed },
      detailFixture({
        photos: [photoFixture({ id: 'foto-1', position: 0 })],
        video: null,
      }),
    );
    renderApp({ route: '/items/item-1', container });
    await screen.findByRole('heading', { name: 'Multimedia' });

    await userEvent.click(
      screen.getByRole('button', { name: /quitar fotografía 1/i }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: /¿quitar la fotografía\?/i,
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar' }),
    );
    expect(removed).toEqual([]);
    expect(dialog).not.toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: /quitar fotografía 1/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(removed).toEqual(['foto-1']);
  });

  it('cuando el objeto ya tiene video, ofrece quitarlo en vez de subir otro', async () => {
    const container = staffOnItem(
      {},
      detailFixture({
        photos: [],
        video: photoFixture({ id: 'video-1', kind: 'VIDEO' }),
      }),
    );
    renderApp({ route: '/items/item-1', container });
    await screen.findByRole('heading', { name: 'Multimedia' });

    expect(
      screen.getByRole('button', { name: /quitar vídeo/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/subir vídeo/i)).not.toBeInTheDocument();
  });
});

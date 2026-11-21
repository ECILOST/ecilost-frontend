import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  STUDENT,
  createFakeAuthGateway,
  createFakeNotificationGateway,
  createTestContainer,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

describe('Notificaciones', () => {
  it('muestra la bandeja real, no avisos de ejemplo, y permite marcarla como leida', async () => {
    renderApp({
      route: '/notificaciones',
      container: createTestContainer({
        auth: createFakeAuthGateway(STUDENT),
        notifications: createFakeNotificationGateway([
          {
            id: 'n1',
            kind: 'OUTBID',
            title: 'Te superaron',
            body: 'Alguien pujó 150 ECICoin en el objeto 1.',
            at: new Date().toISOString(),
            read: false,
            roomId: 'sala-04',
          },
        ]),
      }),
    });

    const main = await screen.findByRole('main');
    expect(await within(main).findByText('Te superaron')).toBeInTheDocument();
    expect(within(main).getAllByRole('listitem')).toHaveLength(1);
    expect(
      await screen.findByRole('link', { name: /notificaciones, 1 sin leer/i }),
    ).toBeInTheDocument();
    // Ya no hay una columna de "estados" que parezca una segunda bandeja inventada.
    expect(screen.queryByText(/estados de la subasta/i)).not.toBeInTheDocument();

    const markAll = screen.getByRole('button', { name: /marcar todas como leídas/i });
    await userEvent.click(markAll);
    expect(await screen.findByRole('button', { name: /marcar todas como leídas/i })).toBeDisabled();
    // La campana deja de avisar.
    expect(await screen.findByRole('link', { name: 'Notificaciones' })).toBeInTheDocument();
  });

  it('sin avisos explica que hara la bandeja', async () => {
    renderApp({
      route: '/notificaciones',
      container: createTestContainer({ auth: createFakeAuthGateway(STUDENT) }),
    });
    expect(await screen.findByText('No tienes notificaciones')).toBeInTheDocument();
  });
});

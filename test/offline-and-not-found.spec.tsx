import { act, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeItemGateway,
  createFakeWalletGateway,
  createTestContainer,
  walletFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/** Simula que el navegador pierde (o recupera) la red, como lo hace el evento real. */
function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

function student() {
  return createTestContainer({
    auth: createFakeAuthGateway(STUDENT),
    wallet: createFakeWalletGateway({
      wallet: walletFixture({ availableBalance: '950.00' }),
    }),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Sin conexión', () => {
  it('el marco avisa sin bloquear y confirma cuando vuelve la red', async () => {
    renderApp({
      route: '/items',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        items: createFakeItemGateway({ items: [] }),
      }),
    });
    await screen.findByRole('heading', { name: 'Catálogo' });

    setOnline(false);
    expect(await screen.findByText(/sin conexión\./i)).toBeInTheDocument();
    // Avisa, pero la pantalla sigue ahi.
    expect(
      screen.getByRole('heading', { name: 'Catálogo' }),
    ).toBeInTheDocument();

    setOnline(true);
    expect(
      await screen.findByText(/volviste a tener conexión/i),
    ).toBeInTheDocument();
  });

  it('la sala en vivo pausa las pujas mientras no hay red', async () => {
    renderApp({ route: '/salas/sala-04', container: student() });
    const bid = await screen.findByRole('button', {
      name: /pujar 480 ecicoin/i,
    });
    expect(bid).toBeEnabled();

    setOnline(false);
    const notice = await screen.findByRole('alert');
    expect(
      within(notice).getByText(/perdiste la conexión con la sala/i),
    ).toBeInTheDocument();
    expect(bid).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /pujar esta cantidad/i }),
    ).toBeDisabled();

    setOnline(true);
    expect(
      await screen.findByRole('button', { name: /pujar 480 ecicoin/i }),
    ).toBeEnabled();
  });
});

describe('Dirección inexistente', () => {
  it('ofrece volver al inicio, no a una sección de un solo rol', async () => {
    renderApp({ route: '/no-existe', container: student() });

    expect(
      await screen.findByRole('heading', { name: 'Esta dirección no existe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeAuthGateway, createTestContainer } from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/** Sin sesion: es la situacion de quien vuelve rebotado desde Google. */
const anonymous = () =>
  createTestContainer({ auth: createFakeAuthGateway(null) });

describe('Portada', () => {
  it('explica por que el servicio rechazo la entrada', async () => {
    renderApp({
      route: '/login?error=account_suspended',
      container: anonymous(),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /tu cuenta está inactiva/i,
    );
  });

  it('no pinta crudo un codigo que no reconoce', async () => {
    renderApp({
      route: '/login?error=<algo-inventado>',
      container: anonymous(),
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no fue posible completar/i);
    expect(alert).not.toHaveTextContent('algo-inventado');
  });

  it('sin motivo en la direccion no inventa ninguna alarma', async () => {
    renderApp({ route: '/login', container: anonymous() });

    expect(
      await screen.findByRole('button', { name: /continuar con google/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si Google rechaza la cuenta, sugiere otra cuenta de Google y ofrece reintentar', async () => {
    renderApp({
      route: '/login?error=domain_not_allowed',
      container: anonymous(),
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no pudimos usar esa cuenta de google/i);
    expect(alert).not.toHaveTextContent('@escuelaing.edu.co');
    expect(alert).not.toHaveTextContent('domain_not_allowed');
    expect(
      screen.getByRole('button', { name: /probar con otra cuenta/i }),
    ).toBeInTheDocument();
  });

  it('un doble clic no abre dos veces el flujo de Google', async () => {
    const auth = createFakeAuthGateway(null);
    const loginUrl = vi.spyOn(auth, 'loginUrl');
    renderApp({ route: '/login', container: createTestContainer({ auth }) });

    const button = await screen.findByRole('button', {
      name: /continuar con google/i,
    });
    await userEvent.dblClick(button);

    expect(loginUrl).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: /abriendo google/i }),
    ).toHaveAttribute('aria-busy', 'true');
  });

  it('sin conexion lo dice, no intenta salir y se recupera al volver la red', async () => {
    const auth = createFakeAuthGateway(null);
    const loginUrl = vi.spyOn(auth, 'loginUrl');
    renderApp({ route: '/login', container: createTestContainer({ auth }) });
    await screen.findByRole('button', { name: /continuar con google/i });

    setOnline(false);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no tienes conexión/i,
    );
    expect(
      screen.getByRole('button', { name: /continuar con google/i }),
    ).toBeDisabled();
    expect(loginUrl).not.toHaveBeenCalled();

    setOnline(true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continuar con google/i }),
    ).toBeEnabled();
  });

  it('deja volver a la portada publica', async () => {
    renderApp({ route: '/login', container: anonymous() });

    expect(
      await screen.findByRole('link', { name: /volver al inicio/i }),
    ).toHaveAttribute('href', '/');
  });
});

/** jsdom siempre dice estar en linea: se fuerza y se avisa como lo haria el navegador. */
function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

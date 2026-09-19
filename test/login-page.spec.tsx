import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
      await screen.findByRole('button', { name: /entrar con google/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

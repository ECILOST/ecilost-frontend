import { QueryClient } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers/app-providers';
import { useSession } from '@/features/auth/hooks/use-session';
import { ApiError } from '@/shared/api/problem-details';
import { createFakeAuthGateway, createTestContainer, STUDENT } from './helpers/fake-gateways';

function Status() {
  return <p>estado: {useSession().status}</p>;
}

function setup() {
  const auth = createFakeAuthGateway(STUDENT);
  const exchange = vi.spyOn(auth, 'exchangeSession');
  const container = createTestContainer({ auth });
  render(
    <AppProviders container={container} queryClient={new QueryClient()}>
      <Status />
    </AppProviders>,
  );
  return { container, exchange };
}

const unauthenticated = new ApiError({ type: 'about:blank', title: 'No autenticado', status: 401 });

describe('sesion ante un 401', () => {
  it('con la cookie aun vigente renueva el token en vez de cerrar la sesion', async () => {
    const { container, exchange } = setup();
    await screen.findByText('estado: authenticated');

    // El access token vencio (portatil suspendido) y un servicio respondio 401.
    await act(async () => container.sessionLost.emit());

    expect(exchange).toHaveBeenCalledTimes(2);
    expect(screen.getByText('estado: authenticated')).toBeInTheDocument();
  });

  it('si el canje tambien falla, la sesion se cierra', async () => {
    const { container, exchange } = setup();
    await screen.findByText('estado: authenticated');
    exchange.mockRejectedValue(unauthenticated);

    await act(async () => container.sessionLost.emit());

    expect(await screen.findByText('estado: anonymous')).toBeInTheDocument();
  });

  it('varios 401 seguidos no disparan un canje por cada uno', async () => {
    const { container, exchange } = setup();
    await screen.findByText('estado: authenticated');

    await act(async () => {
      container.sessionLost.emit();
      container.sessionLost.emit();
      container.sessionLost.emit();
    });
    await act(async () => container.sessionLost.emit());

    expect(exchange).toHaveBeenCalledTimes(2);
  });
});

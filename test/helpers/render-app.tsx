import { QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Container } from '@/app/container';
import { AppProviders } from '@/app/providers/app-providers';
import { AppRouter } from '@/app/router';
import { createTestContainer } from './fake-gateways';

export interface RenderAppOptions {
  /** Direccion inicial. Ejercita el router y los guards, no solo la pantalla. */
  route?: string;
  container?: Container;
}

/**
 * Monta la aplicacion entera con dobles, en la direccion que pida la prueba.
 *
 * Se renderiza desde el router y no desde la pantalla suelta porque asi las pruebas cubren
 * tambien lo que decide el guard, que es donde de verdad se equivoca uno.
 */
export function renderApp({
  route = '/',
  container = createTestContainer(),
}: RenderAppOptions = {}): RenderResult {
  const queryClient = new QueryClient({
    // Sin reintentos: una prueba que espera un error no debe quedarse esperando dos
    // reintentos antes de verlo.
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <AppProviders container={container} queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AppRouter />
      </MemoryRouter>
    </AppProviders>,
  );
}

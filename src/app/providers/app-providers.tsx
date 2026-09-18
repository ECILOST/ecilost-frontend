import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SessionProvider } from '@/features/auth/session/session-provider';
import type { Container } from '../container';
import { ContainerProvider } from './container-provider';

/**
 * Los proveedores que envuelven a toda la aplicacion, en el unico orden que funciona:
 * el contenedor primero, porque la sesion pide de ahi el puerto de identidad, y la sesion
 * antes que las pantallas, porque son las que preguntan si hay alguien dentro.
 *
 * Recibe el contenedor y el cliente de consultas en vez de construirlos: asi una prueba
 * monta la aplicacion entera con dobles, y quien la arranca de verdad (`main.tsx`) sigue
 * siendo el unico sitio donde se decide la implementacion real.
 */
export function AppProviders({
  container,
  queryClient,
  children,
}: {
  container: Container;
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <ContainerProvider container={container}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    </ContainerProvider>
  );
}

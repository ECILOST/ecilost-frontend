import { createContext, use, type ReactNode } from 'react';
import type { Container } from '../container';

/**
 * Reparte las dependencias del contenedor por el arbol, que es la forma que tiene React de
 * hacer lo que en Nest hace la inyeccion por constructor.
 *
 * Los hooks piden aqui su puerto en vez de importar el adaptador HTTP: por eso una prueba
 * puede montar la misma pantalla con dobles sin tocar la pantalla.
 */
const ContainerContext = createContext<Container | null>(null);

export function ContainerProvider({
  container,
  children,
}: {
  container: Container;
  children: ReactNode;
}) {
  return <ContainerContext value={container}>{children}</ContainerContext>;
}

export function useContainer(): Container {
  const container = use(ContainerContext);
  // Falla aqui y con nombre propio. Sin esto, el error seria un `undefined` dentro del
  // primer hook que intente pedir datos, tres capas mas abajo.
  if (!container) {
    throw new Error('useContainer se uso fuera de <ContainerProvider>');
  }
  return container;
}

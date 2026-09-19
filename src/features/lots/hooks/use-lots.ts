import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { Lot } from '../model/lot';

/** Claves de cache de lotes. Centralizadas por lo mismo que las del catalogo. */
export const lotKeys = {
  all: ['lots'] as const,
  lists: () => [...lotKeys.all, 'list'] as const,
  detail: (id: string) => [...lotKeys.all, 'detail', id] as const,
};

/**
 * Caso de uso "ver los lotes" (HU-06).
 *
 * Sin paginar, a diferencia del catalogo: `GET /lots` no acepta `limit` ni `offset` y
 * devuelve todos. Inventar aqui una paginacion que el servicio no hace solo serviria para
 * esconder filas que ya llegaron.
 */
export function useLots() {
  const { lots } = useContainer();

  return useQuery<Lot[]>({
    queryKey: lotKeys.lists(),
    queryFn: () => lots.list(),
  });
}

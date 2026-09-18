import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { ItemSummary, ListItemsQuery } from '../model/item';

/**
 * Claves de cache del catalogo.
 *
 * Centralizadas porque quien escribe (subir una foto, editar un objeto) tiene que invalidar
 * lo que otro escribio, y no puede depender de recordar como se armo la clave alla.
 */
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (query: ListItemsQuery) => [...itemKeys.lists(), query] as const,
  detail: (id: string) => [...itemKeys.all, 'detail', id] as const,
};

/**
 * Caso de uso "ver el catalogo". Es la capa que en el back ocupa `ItemsService`: la
 * pantalla pide datos aqui y no sabe si vienen de la red o de la cache.
 */
export function useItems(query: ListItemsQuery = {}) {
  const { items } = useContainer();

  return useQuery<ItemSummary[]>({
    queryKey: itemKeys.list(query),
    queryFn: () => items.list(query),
  });
}

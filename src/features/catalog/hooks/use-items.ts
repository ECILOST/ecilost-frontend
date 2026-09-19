import { useInfiniteQuery } from '@tanstack/react-query';
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
 * Cuantos objetos por pagina. Mas bajo que el tope del servicio (50 por defecto, 200 como
 * maximo) porque aqui la pagina se mide en tarjetas: veinticuatro llenan tres pantallas, y
 * pedir doscientas de golpe seria bajar fotografias que nadie va a mirar.
 */
export const PAGE_SIZE = 24;

/**
 * Las portadas que trae el listado van firmadas y duran quince minutos, asi que la lista
 * envejece al ritmo de sus enlaces: pasada la ventana, una pagina servida de cache pintaria
 * imagenes rotas. Es la misma razon, y el mismo margen, que en `useItem`.
 */
const SIGNED_URL_SAFE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Caso de uso "ver el catalogo". Es la capa que en el back ocupa `ItemsService`: la
 * pantalla pide datos aqui y no sabe si vienen de la red o de la cache.
 *
 * Va por paginas porque el servicio siempre las devuelve: sin `limit` aplica cincuenta y el
 * cliente no se entera de que hay mas. Una lista que se corta en silencio es peor que una
 * corta, porque parece completa.
 *
 * El final se reconoce por una pagina mas corta que el tope. El servicio no informa del
 * total, asi que no hay forma de saber cuantos quedan sin pedirlos; lo que si se puede es
 * saber cuando ya no queda ninguno.
 */
export function useItems(query: ListItemsQuery = {}) {
  const { items } = useContainer();

  return useInfiniteQuery<ItemSummary[]>({
    queryKey: itemKeys.list(query),
    queryFn: ({ pageParam }) =>
      items.list({ ...query, limit: PAGE_SIZE, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    staleTime: SIGNED_URL_SAFE_WINDOW_MS,
    gcTime: SIGNED_URL_SAFE_WINDOW_MS,
  });
}

import { UNAVAILABLE_STATUSES } from '@/features/catalog/domain/item-status';
import { useItems } from '@/features/catalog/hooks/use-items';

/**
 * Los objetos del catalogo que no se pueden poner en una ronda, con su estado.
 *
 * El servicio filtra por un solo estado a la vez, asi que son cuatro consultas, una por cada
 * estado que deja a un objeto fuera. Filtrar `AVAILABLE` en el cliente seria bajar paginas
 * enteras de objetos que no se van a mostrar.
 *
 * Solo se monta cuando alguien abre el popup: quien programa una sala sin mirar esta lista no
 * paga estas cuatro peticiones.
 */
export function useUnavailableItems() {
  const [inLot, inRound, sold, withdrawn] = [
    useItems({ status: UNAVAILABLE_STATUSES[0] }),
    useItems({ status: UNAVAILABLE_STATUSES[1] }),
    useItems({ status: UNAVAILABLE_STATUSES[2] }),
    useItems({ status: UNAVAILABLE_STATUSES[3] }),
  ];
  const queries = [inLot, inRound, sold, withdrawn];

  return {
    items: queries.flatMap((query) => query.data?.pages.flat() ?? []),
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => queries.forEach((query) => void query.refetch()),
    hasMore: queries.some((query) => query.hasNextPage),
    isLoadingMore: queries.some((query) => query.isFetchingNextPage),
    loadMore: () =>
      queries.forEach((query) => {
        if (query.hasNextPage) void query.fetchNextPage();
      }),
  };
}

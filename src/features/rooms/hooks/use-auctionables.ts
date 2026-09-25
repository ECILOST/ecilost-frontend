import { ItemStatus } from '@/features/catalog/domain/item-status';
import { useItems } from '@/features/catalog/hooks/use-items';
import { LotStatus } from '@/features/lots/domain/lot-status';
import { useLots } from '@/features/lots/hooks/use-lots';
import { AuctionableKind } from '../domain/room-status';
import type { RoundEntry } from '../model/room';

/** Una opcion para una ronda: algo del catalogo que todavia se puede subastar. */
export interface Auctionable extends RoundEntry {
  /** `KIND:catalogId`. Identifica la opcion en un `<select>`, que solo guarda texto. */
  key: string;
  name: string;
  /** Categoria del objeto, o cuantos objetos lleva el lote. */
  detail: string;
}

export const auctionableKey = (entry: RoundEntry): string =>
  `${entry.kind}:${entry.catalogId}`;

/**
 * Lo que se puede poner en una ronda: objetos disponibles y lotes activos.
 *
 * Son las dos unicas condiciones que catalog acepta al reservar. Un objeto que ya esta en un
 * lote no se ofrece suelto: va con su lote. Como en el selector de lotes, la comprobacion de
 * verdad es del servicio: entre que se pinta la lista y se confirma, otro funcionario puede
 * haberse llevado alguno, y entonces la programacion entera responde 409.
 */
export function useAuctionables() {
  const items = useItems({ status: ItemStatus.AVAILABLE });
  const lots = useLots();

  const options: Auctionable[] = [
    ...(items.data?.pages.flat() ?? []).map((item) => ({
      kind: AuctionableKind.ITEM,
      catalogId: item.id,
      key: auctionableKey({ kind: AuctionableKind.ITEM, catalogId: item.id }),
      name: item.name,
      detail: item.category,
    })),
    ...(lots.data ?? [])
      .filter((lot) => lot.status === LotStatus.ACTIVE)
      .map((lot) => ({
        kind: AuctionableKind.LOT,
        catalogId: lot.id,
        key: auctionableKey({ kind: AuctionableKind.LOT, catalogId: lot.id }),
        name: lot.name,
        detail: `${lot.items.length} objetos`,
      })),
  ];

  return {
    options,
    isPending: items.isPending || lots.isPending,
    error: items.error ?? lots.error,
    refetch: () => {
      void items.refetch();
      void lots.refetch();
    },
    hasMoreItems: items.hasNextPage,
    loadMoreItems: () => void items.fetchNextPage(),
    isLoadingMore: items.isFetchingNextPage,
  };
}

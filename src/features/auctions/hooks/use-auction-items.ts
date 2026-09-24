import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { auctionKeys } from './auction-keys';

/** Caso de uso "ver lo que se subasta": catalogo y portada. */
export function useAuctionItems() {
  const { auctions } = useContainer();
  return useQuery({
    queryKey: auctionKeys.items(),
    queryFn: () => auctions.items(),
    // El precio de lo que esta en vivo cambia solo; la lista se refresca cada tanto.
    refetchInterval: 15_000,
  });
}

export function useAuctionItem(id: string) {
  const { auctions } = useContainer();
  return useQuery({
    queryKey: auctionKeys.item(id),
    queryFn: () => auctions.item(id),
    refetchInterval: 5_000,
  });
}

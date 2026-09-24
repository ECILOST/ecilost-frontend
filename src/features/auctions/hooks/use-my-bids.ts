import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { auctionKeys } from './auction-keys';

/** Caso de uso "mis pujas": activas (ganando, superado) e historial (ganada, perdida). */
export function useMyBids() {
  const { auctions } = useContainer();
  return useQuery({
    queryKey: auctionKeys.myBids(),
    queryFn: () => auctions.myBids(),
    refetchInterval: 10_000,
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useContainer } from '@/app/providers/container-provider';
import { walletKeys } from '@/features/wallet/hooks/use-wallet';
import type { LiveRoom } from '../model/auction';
import { auctionKeys } from './auction-keys';

/**
 * Estado en vivo de una sala.
 *
 * Primero se consulta (lo que en auction-service es `GET /rooms/:id/state`) y despues se
 * escucha el canal en vivo: cada cambio reemplaza la cache. Asi, al reconectar, el cliente
 * vuelve a partir del estado vigente y no de lo ultimo que vio.
 */
export function useLiveRoom(roomId: string, enabled = true) {
  const { auctions } = useContainer();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    return auctions.subscribe(roomId, (state) => {
      queryClient.setQueryData(auctionKeys.live(roomId), state);
      // La transicion de ronda o el cierre de la sala tambien cambian la sala.
      queryClient.setQueryData(auctionKeys.room(roomId), state.room);
      // Un cambio en vivo puede traer un aviso personal (superado, ganado): la bandeja se
      // relee ya, sin esperar su propio intervalo.
      void queryClient.invalidateQueries({ queryKey: auctionKeys.notifications() });
    });
  }, [auctions, queryClient, roomId, enabled]);

  return useQuery({
    queryKey: auctionKeys.live(roomId),
    queryFn: () => auctions.liveRoom(roomId),
    enabled,
  });
}

function useLiveMutation<TInput>(
  roomId: string,
  operation: (input: TInput) => Promise<LiveRoom>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: operation,
    onSuccess: (state) => {
      queryClient.setQueryData(auctionKeys.live(roomId), state);
      queryClient.setQueryData(auctionKeys.room(roomId), state.room);
      void queryClient.invalidateQueries({ queryKey: auctionKeys.myBids() });
      void queryClient.invalidateQueries({
        queryKey: auctionKeys.notifications(),
      });
      // Pujar compromete ECICoin, y ser superado los libera: el saldo cambio en wallet.
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}

export function usePlaceBid(roomId: string) {
  const { auctions } = useContainer();
  return useLiveMutation(roomId, (amount: number) =>
    auctions.placeBid(roomId, amount),
  );
}

export function useBuyNow(roomId: string) {
  const { auctions } = useContainer();
  return useLiveMutation(roomId, () => auctions.buyNow(roomId));
}

export function useAutoBid(roomId: string) {
  const { auctions } = useContainer();
  return useLiveMutation(
    roomId,
    (config: { enabled: boolean; limit: number }) =>
      auctions.setAutoBid(roomId, config),
  );
}

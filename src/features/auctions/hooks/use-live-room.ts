import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useContainer } from '@/app/providers/container-provider';
import { walletKeys } from '@/features/wallet/hooks/use-wallet';
import type { LiveRoom } from '../model/auction';
import { auctionKeys } from './auction-keys';

/**
 * Wallet liquida por su cuenta, en paralelo con el aviso en vivo: la liberacion al ser
 * superado y la liquidacion al cerrar la ronda pueden llegar un instante despues que el
 * evento. Por eso el saldo se relee al momento y otra vez pasado este margen.
 */
const WALLET_SETTLE_DELAY_MS = 3_000;

/**
 * Lo que de la sala mueve el saldo de quien mira: liderar o no, su puja mas alta (tambien
 * la que hace por el la puja automatica) y que cada ronda siga abierta o haya cerrado.
 */
function walletSignature(state: LiveRoom): string {
  return state.room.rounds
    .map((round) => `${round.id}:${round.status}:${round.leading}:${round.myHighestBid}`)
    .join('|');
}

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
    let lastSignature: string | null = null;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const refreshWallet = () =>
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });

    const unsubscribe = auctions.subscribe(roomId, (state) => {
      // La primera vez se compara con lo que pinto la consulta inicial, no con nada.
      if (lastSignature === null) {
        const shown = queryClient.getQueryData<LiveRoom>(auctionKeys.live(roomId));
        if (shown) lastSignature = walletSignature(shown);
      }
      queryClient.setQueryData(auctionKeys.live(roomId), state);
      // La transicion de ronda o el cierre de la sala tambien cambian la sala.
      queryClient.setQueryData(auctionKeys.room(roomId), state.room);
      // Un cambio en vivo puede traer un aviso personal (superado, ganado): la bandeja se
      // relee ya, sin esperar su propio intervalo.
      void queryClient.invalidateQueries({ queryKey: auctionKeys.notifications() });

      // Ser superado libera la reserva, cerrar la ronda cobra o devuelve, y la puja
      // automatica reserva sin que la persona haga nada: en todos esos casos cambio el
      // saldo en wallet y la cabecera no puede seguir mostrando el anterior.
      const signature = walletSignature(state);
      if (lastSignature !== null && signature !== lastSignature) {
        refreshWallet();
        const timer = setTimeout(() => {
          timers.delete(timer);
          refreshWallet();
        }, WALLET_SETTLE_DELAY_MS);
        timers.add(timer);
      }
      lastSignature = signature;
    });

    return () => {
      timers.forEach(clearTimeout);
      unsubscribe();
    };
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

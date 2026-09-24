import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { auctionKeys } from './auction-keys';

export function useRoom(id: string) {
  const { auctions } = useContainer();
  return useQuery({
    queryKey: auctionKeys.room(id),
    queryFn: () => auctions.room(id),
    // La sala programada pasa a en curso sola a su hora; hay que enterarse.
    refetchInterval: 5_000,
  });
}

/** Caso de uso "unirme a la sala antes de que empiece". */
export function useJoinRoom(id: string) {
  const { auctions } = useContainer();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auctions.joinRoom(id),
    onSuccess: (room) => {
      queryClient.setQueryData(auctionKeys.room(id), room);
      void queryClient.invalidateQueries({ queryKey: auctionKeys.all });
    },
  });
}

export function useRoomSummary(id: string, enabled = true) {
  const { auctions } = useContainer();
  return useQuery({
    queryKey: auctionKeys.summary(id),
    queryFn: () => auctions.roomSummary(id),
    enabled,
  });
}

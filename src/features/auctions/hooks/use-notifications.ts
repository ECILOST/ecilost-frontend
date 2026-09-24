import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { useSession } from '@/features/auth/hooks/use-session';
import { auctionKeys } from './auction-keys';

/**
 * Notificaciones de quien puja. Un funcionario no participa en subastas, asi que no se le
 * piden: la campana de la cabecera ni siquiera aparece.
 */
export function useNotifications() {
  const { auctions } = useContainer();
  const { principal } = useSession();
  return useQuery({
    queryKey: auctionKeys.notifications(),
    queryFn: () => auctions.notifications(),
    enabled: principal?.canBid === true,
    refetchInterval: 10_000,
  });
}

export function useMarkNotificationsRead() {
  const { auctions } = useContainer();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auctions.markNotificationsRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: auctionKeys.notifications() }),
  });
}

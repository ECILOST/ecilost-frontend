import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { useSession } from '@/features/auth/hooks/use-session';
import { auctionKeys } from './auction-keys';

/**
 * Notificaciones de quien puja. Un funcionario no participa en subastas, asi que no se le
 * piden: la campana de la cabecera ni siquiera aparece.
 */
export function useNotifications() {
  const { notifications } = useContainer();
  const { principal } = useSession();
  return useQuery({
    queryKey: auctionKeys.notifications(),
    queryFn: () => notifications.list(),
    enabled: principal?.canBid === true,
    refetchInterval: 10_000,
  });
}

export function useMarkNotificationsRead() {
  const { notifications } = useContainer();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notifications.markAllRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: auctionKeys.notifications() }),
  });
}

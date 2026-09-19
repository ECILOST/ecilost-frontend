import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { RechargeRequest, RechargeResult } from '../model/wallet';
import { walletKeys } from './use-wallet';

export interface RechargeInput {
  userId: string;
  request: RechargeRequest;
}

/**
 * Caso de uso "recargar la billetera de alguien" (operacion de funcionario).
 *
 * Se invalida la billetera propia por si el funcionario se recargo a si mismo, que es lo que
 * va a pasar mientras se prueba. En el caso normal la recarga es para otra persona, y su
 * navegador no se entera hasta que vuelva a entrar: no hay forma de avisarle sin salas.
 */
export function useRecharge() {
  const { wallet } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<RechargeResult, Error, RechargeInput>({
    mutationFn: ({ userId, request }: RechargeInput) =>
      wallet.recharge(userId, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: walletKeys.mine() }),
  });
}

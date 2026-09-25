import { useInfiniteQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { WalletTransactionPage } from '../model/wallet';
import { walletKeys } from './use-wallet';

/**
 * Caso de uso "ver mis movimientos" (HU-10).
 *
 * Va por paginas porque el servicio pagina, y a diferencia del catalogo si informa el total:
 * hay mas mientras lo ya cargado no lo alcance. Comparte raiz de cache con el saldo, asi que
 * cuando una puja invalida la billetera tambien se relee el historial.
 */
export function useWalletTransactions() {
  const { wallet } = useContainer();

  return useInfiniteQuery<WalletTransactionPage>({
    queryKey: walletKeys.transactions(),
    queryFn: ({ pageParam }) => wallet.transactions(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
}

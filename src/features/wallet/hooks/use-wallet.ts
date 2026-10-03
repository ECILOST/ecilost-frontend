import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { useSession } from '@/features/auth/hooks/use-session';
import type { Wallet } from '../model/wallet';

export const walletKeys = {
  all: ['wallet'] as const,
  mine: () => [...walletKeys.all, 'mine'] as const,
  transactions: () => [...walletKeys.all, 'transactions'] as const,
};

/**
 * Caso de uso "ver mi saldo en ECICoin".
 *
 * Se declara como consulta aunque por debajo sea un `POST`, y eso pide explicacion: el
 * servicio todavia no publica ningun `GET`. Lo unico que devuelve una billetera es
 * `POST /wallet/me/bootstrap`, que la crea con el saldo inicial la primera vez y despues la
 * devuelve sin tocarla. Al ser idempotente se comporta como una lectura, asi que se modela
 * como lo que hace y no como el verbo que usa.
 *
 * Solo se pide a quien puja. Un funcionario no participa en las subastas, y llamarlo con su
 * sesion le abriria una billetera que no va a usar nunca.
 */
export function useWallet() {
  const { wallet } = useContainer();
  const { principal } = useSession();

  return useQuery<Wallet>({
    queryKey: walletKeys.mine(),
    queryFn: () => wallet.mine(),
    enabled: principal?.canBid === true,
    /*
     * El saldo cambia fuera de esta sesion: una recarga del funcionario, la liberacion al
     * ser superado, la liquidacion al cerrar una ronda o la puja automatica. La sala en vivo
     * lo relee cuando pasa algo de eso; fuera de ella, medio minuto basta para no mostrar un
     * numero viejo al cambiar de pantalla.
     */
    staleTime: 30 * 1000,
    // Que falle la billetera no puede tumbar el catalogo: la cabecera simplemente no
    // enseña el saldo.
    retry: false,
  });
}

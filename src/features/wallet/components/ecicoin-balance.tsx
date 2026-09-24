import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Coin, formatCoins } from '@/shared/components/ui/coin';
import { useWallet } from '../hooks/use-wallet';
import styles from './ecicoin-balance.module.css';

/**
 * El saldo disponible en ECICoin, en la cabecera, y el atajo a la billetera.
 *
 * No se pinta nada mientras no haya saldo que enseñar: a un funcionario no se le consulta la
 * billetera, y un fallo del servicio no puede dejar un hueco ni un mensaje de error en la
 * cabecera de todas las pantallas. Que falte el saldo no impide usar el resto.
 */
export function EcicoinBalance() {
  const { data: wallet } = useWallet();

  if (!wallet) return null;

  return (
    <Link className={styles.balance} to={routes.wallet}>
      <Coin size={20} />
      {/* Lo que se lee es la cifra; el lector de pantalla necesita saber de que es. */}
      <span className="u-sr-only">Saldo disponible: </span>
      <span className={styles.value}>
        {formatCoins(wallet.availableBalance)}
      </span>
      <span className="u-sr-only"> ECICoin</span>
    </Link>
  );
}

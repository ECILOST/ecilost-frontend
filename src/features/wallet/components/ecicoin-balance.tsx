import { Pill } from '@/shared/components/ui/pill';
import { formatEcicoin } from '../domain/ecicoin';
import { useWallet } from '../hooks/use-wallet';
import styles from './ecicoin-balance.module.css';

/**
 * El saldo en ECICoin, en la cabecera.
 *
 * No se pinta nada mientras no haya saldo que enseñar: a un funcionario no se le consulta la
 * billetera, y un fallo del servicio no puede dejar un hueco ni un mensaje de error en la
 * cabecera de todas las pantallas. Que falte el saldo no impide usar el catalogo.
 *
 * Tampoco se enseña el retenido. Hoy es cero siempre, porque las operaciones que lo mueven
 * existen en el esquema pero no las produce ningun endpoint: llegaran con las salas, y
 * entonces "retenido" significara algo que la persona pueda reconocer.
 */
export function EcicoinBalance() {
  const { data: wallet } = useWallet();

  if (!wallet) return null;

  return (
    <Pill tone="yellow" className={styles.balance}>
      {/* Lo que se lee es la cifra; el lector de pantalla necesita saber de que es. */}
      <span className="u-sr-only">Saldo disponible: </span>
      <span className="u-numeric">
        {formatEcicoin(wallet.availableBalance)}
      </span>
      <span className={styles.unit}>ECICoin</span>
    </Pill>
  );
}

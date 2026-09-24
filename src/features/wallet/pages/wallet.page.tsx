import type { CSSProperties } from 'react';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import { Icon } from '@/shared/components/ui/icon';
import { useWallet } from '../hooks/use-wallet';
import styles from './wallet.page.module.css';

/**
 * Mi billetera: total, disponible y comprometido, siempre distinguibles.
 *
 * Los saldos vienen de ecilost-wallet-service. El historial de movimientos todavia no: el
 * servicio guarda cada movimiento pero no publica ningun endpoint que los devuelva, asi que
 * la seccion lo dice en lugar de inventar filas.
 */
export function WalletPage() {
  const { data: wallet, isPending, isError, error, refetch } = useWallet();

  const available = wallet ? Number(wallet.availableBalance) : 0;
  const held = wallet ? Number(wallet.heldBalance) : 0;
  const total = available + held;
  const share = total > 0 ? available / total : 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Mi billetera</h1>

      {isPending ? <Loading label="Consultando tu saldo..." /> : null}
      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {wallet ? (
        <>
          <div className={styles.top}>
            <section className={styles.balance} aria-label="Saldo ECICoin">
              <div className={styles.balanceHead}>
                <span className={styles.badge} aria-hidden="true">
                  EC
                </span>
                <div>
                  <span className={styles.caption}>Saldo ECICoin</span>
                  <span className={styles.total}>{formatCoins(total)}</span>
                </div>
              </div>

              <div
                className={styles.bar}
                style={
                  { '--share': `${Math.round(share * 100)}%` } as CSSProperties
                }
                role="img"
                aria-label={`${Math.round(share * 100)} % disponible`}
              />

              <dl className={styles.split}>
                <div>
                  <dt>Disponible</dt>
                  <dd className={styles.cyan}>{formatCoins(available)}</dd>
                </div>
                <div>
                  <dt>Comprometido</dt>
                  <dd className={styles.pink}>{formatCoins(held)}</dd>
                </div>
                <div className={styles.right}>
                  <dt>Total</dt>
                  <dd>{formatCoins(total)}</dd>
                </div>
              </dl>

              <div className={styles.actions}>
                <Button
                  size="lg"
                  disabled
                  title="Las recargas las abona un funcionario"
                >
                  Solicitar recarga ECICoin
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled
                  title="Todavía no disponible"
                >
                  <Icon name="swap" size={16} /> Transferir
                </Button>
              </div>
            </section>

            <section className={styles.info} aria-labelledby="que-es">
              <h2 id="que-es" className={styles.infoTitle}>
                ¿Qué es el ECICoin?
              </h2>
              <p className={styles.infoText}>
                Es la moneda interna de la universidad. La usas para pujar y
                comprar en las salas de subasta. No hay pasarela de pagos: tu
                saldo viene de la billetera universitaria.
              </p>
              <ul className={styles.facts}>
                <li>
                  <span>Comprometido en pujas activas</span>
                  <strong>{formatCoins(held)}</strong>
                </li>
                <li>
                  <span>Disponible para pujar</span>
                  <strong>{formatCoins(available)}</strong>
                </li>
                <li>
                  <span>Recargas</span>
                  <strong className={styles.plain}>
                    Las abona un funcionario
                  </strong>
                </li>
              </ul>
            </section>
          </div>

          <section className={styles.history} aria-labelledby="historial">
            <h2 id="historial" className={styles.historyTitle}>
              Historial de movimientos
            </h2>
            <p className={styles.historyEmpty}>
              El historial llegará cuando ecilost-wallet-service publique sus
              movimientos. Tu saldo ya está actualizado.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

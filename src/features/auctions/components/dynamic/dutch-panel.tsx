import { useEffect, useState } from 'react';
import { serverNow } from '@/shared/api/server-clock';
import { Button } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import { dutchHistory, dutchNextDrop, dutchPriceAt } from '../../domain/dynamic-modes';
import type { Round } from '../../model/auction';
import styles from './dynamic.module.css';

/** Cada cuanto se repinta el precio. El cambio real es cada pocos segundos. */
const TICK_MS = 250;

/**
 * Subasta holandesa en juego: el precio vigente, cuanto falta para la proxima bajada y el
 * boton "¡Lo quiero!". El precio se calcula con la hora del servidor; el que se cobra lo
 * decide auction al cerrar, asi que lo pintado nunca puede cobrar de mas.
 */
export function DutchPanel({
  round,
  available,
  pending,
  watchers,
  onClaim,
}: {
  round: Round;
  available: number | null;
  pending: boolean;
  watchers: number;
  onClaim: (price: number) => void;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  if (!round.dutch || !round.startedAt) return null;
  const price = dutchPriceAt(round.dutch, round.startedAt, now);
  const next = dutchNextDrop(round.dutch, round.startedAt, now);
  const passed = dutchHistory(round.dutch, round.startedAt, now);
  const affordable = available === null || available >= price;

  return (
    <div className={styles.panel}>
      <div>
        <p className={styles.label}>Precio actual</p>
        <p className={styles.heroPrice} aria-live="polite">
          {formatCoins(price)}
          <small>ECI</small>
        </p>
      </div>

      <div>
        <div className={styles.row}>
          <span className={styles.muted}>
            {next.inMs === null
              ? 'Llegó al precio mínimo: ya no baja más'
              : `Baja a ${formatCoins(next.nextPrice ?? price)} en ${Math.ceil(next.inMs / 1000)} s`}
          </span>
          <span className={styles.muted}>Mínimo {formatCoins(round.dutch.floorPrice)}</span>
        </div>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.trackFill} style={{ width: `${Math.round(next.progress * 100)}%` }} />
        </div>
      </div>

      {passed.length ? (
        <div className={styles.chips} aria-label="Precios por los que ya pasó">
          {passed.map((value) => (
            <span key={value} className={styles.passed}>
              {formatCoins(value)}
            </span>
          ))}
        </div>
      ) : null}

      <Button
        variant="bid"
        size="block"
        className={styles.bigAction}
        disabled={pending}
        onClick={() => onClaim(price)}
      >
        ✋ ¡Lo quiero!
      </Button>
      <p className={styles.muted}>
        👁 {watchers} mirando ·{' '}
        {affordable ? 'tu saldo alcanza' : `te faltan ${formatCoins(price - (available ?? 0))} ECI`}
      </p>
    </div>
  );
}

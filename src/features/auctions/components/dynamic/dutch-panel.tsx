import { useEffect, useState, type CSSProperties } from 'react';
import { serverNow } from '@/shared/api/server-clock';
import { Button } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import { dutchHistory, dutchNextDrop, dutchPriceAt } from '../../domain/dynamic-modes';
import type { Round } from '../../model/auction';
import styles from './dynamic.module.css';
import { Icon } from '@/shared/components/ui/icon';

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

  // La escalera: los precios por los que ya paso, el actual y el siguiente. La altura de cada
  // escalon es su precio entre el piso y el de salida, asi se ve "caer".
  const span = Math.max(1, round.dutch.startPrice - round.dutch.floorPrice);
  const height = (value: number) => `${Math.round(24 + ((value - round.dutch!.floorPrice) / span) * 76)}%`;

  return (
    <div className={`${styles.panel} ${styles.modePanel}`} style={{ '--mode': 'var(--eci-pink)' } as CSSProperties}>
      <div className={styles.panelHead}>
        <span className={styles.modeBadge}>
          <Icon name="trend-down" size={15} /> Subasta holandesa
        </span>
        <span className={styles.liveTag}>
          <span className={styles.liveDot} aria-hidden="true" /> Bajando
        </span>
      </div>

      <div className={styles.dutchTop}>
        <div>
          <p className={styles.label}>Precio actual</p>
          <p className={`${styles.heroPrice} ${styles.heroMode}`} aria-live="polite">
            {formatCoins(price)}
            <small>ECI</small>
          </p>
        </div>

        <div className={styles.stairs} aria-hidden="true">
          {passed.map((value) => (
            <span key={value} className={styles.step} style={{ height: height(value) }} />
          ))}
          <span className={`${styles.step} ${styles.stepNow}`} style={{ height: height(price) }} />
          {next.nextPrice !== null ? (
            <span className={`${styles.step} ${styles.stepNext}`} style={{ height: height(next.nextPrice) }} />
          ) : null}
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

      <div className={styles.dropBox}>
        <div className={styles.row}>
          <span className={styles.dropText}>
            <Icon name="timer" size={15} />
            {next.inMs === null
              ? 'Llegó al precio mínimo: ya no baja más'
              : `Baja a ${formatCoins(next.nextPrice ?? price)} en ${Math.ceil(next.inMs / 1000)} s`}
          </span>
          <span className={styles.floor}>Mínimo {formatCoins(round.dutch.floorPrice)}</span>
        </div>
        <div className={styles.track} aria-hidden="true">
          <div className={styles.trackFill} style={{ width: `${Math.round(next.progress * 100)}%` }} />
        </div>
      </div>

      <Button
        variant="bid"
        size="block"
        className={styles.bigAction}
        disabled={pending}
        onClick={() => onClaim(price)}
      >
        <Icon name="hand" size={26} />
        ¡Lo quiero!
      </Button>
      <p className={styles.footNote}>
        <span>
          <Icon name="eye" size={15} /> {watchers} mirando
        </span>
        <span className={affordable ? styles.okText : styles.error}>
          {affordable ? 'Tu saldo alcanza' : `Te faltan ${formatCoins(price - (available ?? 0))} ECI`}
        </span>
      </p>
      <p className={styles.hint}>Sin confirmación: gana quien lo pida primero, al precio de ese momento.</p>
    </div>
  );
}

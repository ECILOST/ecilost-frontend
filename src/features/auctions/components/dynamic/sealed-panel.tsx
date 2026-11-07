import { useState, type CSSProperties } from 'react';
import { Button } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import type { Round } from '../../model/auction';
import styles from './dynamic.module.css';
import { Icon } from '@/shared/components/ui/icon';

/** Cuantos sobres se dibujan; los demas se cuentan con el numero. */
const ENVELOPES_SHOWN = 12;

/**
 * Sobre cerrado en juego: la puja secreta, una sola vez. Mientras la ronda esta abierta solo
 * se sabe cuantos sobres hay; los montos se ven en la apertura, al cerrar.
 */
export function SealedPanel({
  round,
  available,
  pending,
  participants,
  onSeal,
}: {
  round: Round;
  available: number | null;
  pending: boolean;
  participants: number;
  onSeal: (amount: number) => void;
}) {
  const [value, setValue] = useState('');
  const count = round.sealed?.count ?? 0;
  const mine = round.sealed?.mine ?? null;
  const amount = Number(value);
  const valid = Number.isInteger(amount) && amount >= round.basePrice;
  const affordable = available === null || amount <= available;

  return (
    <div className={`${styles.panel} ${styles.modePanel}`} style={{ '--mode': 'var(--eci-blue)' } as CSSProperties}>
      <div className={styles.panelHead}>
        <span className={styles.modeBadge}>
          <Icon name="mail" size={15} /> Sobre cerrado
        </span>
        <span className={styles.liveTag}>Una sola puja · a ciegas</span>
      </div>

      <div className={styles.envelopes} aria-label={`${count} sobres sellados`}>
        <div className={styles.envelopeRow} aria-hidden="true">
          {Array.from({ length: Math.min(count, ENVELOPES_SHOWN) }, (_, index) => (
            <span key={index} className={styles.envelope} style={{ animationDelay: `${index * 40}ms` }}>
              <Icon name="mail" size={14} />
            </span>
          ))}
        </div>
        <span className={styles.muted}>
          {count} de {participants} ya sellaron
        </span>
      </div>

      {mine !== null ? (
        <div className={styles.sealedCard}>
          <span className={styles.sealedStamp} aria-hidden="true">
            <Icon name="lock" size={22} />
          </span>
          <p className={styles.label}>Tu sobre está sellado</p>
          <p className={`${styles.heroPrice} ${styles.heroMode}`}>
            {formatCoins(mine)}
            <small>ECI</small>
          </p>
          <p className={styles.muted}>
            No se puede cambiar. El ganador se anuncia cuando se abran los sobres.
          </p>
        </div>
      ) : (
        <form
          className={styles.sealedForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && affordable) onSeal(amount);
          }}
        >
          <label className={styles.label} htmlFor={`sealed-${round.id}`}>
            Tu puja secreta
          </label>
          <div className={styles.sealedField}>
            <input
              id={`sealed-${round.id}`}
              inputMode="numeric"
              placeholder={formatCoins(round.basePrice)}
              value={value}
              onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
              aria-describedby={`sealed-help-${round.id}`}
            />
            <span className={styles.sealedUnit}>ECI</span>
          </div>
          <div className={styles.row} id={`sealed-help-${round.id}`}>
            <span className={styles.muted}>Base {formatCoins(round.basePrice)}</span>
            {available !== null ? (
              <span className={styles.muted}>Saldo {formatCoins(available)}</span>
            ) : null}
          </div>
          {value !== '' && !valid ? (
            <p className={styles.error}>La puja debe ser de al menos {formatCoins(round.basePrice)} ECI.</p>
          ) : null}
          {valid && !affordable ? (
            <p className={styles.error}>No te alcanza el saldo para esa puja.</p>
          ) : null}
          <p className={styles.warn}>
            <Icon name="alert" size={16} />
            Solo una oportunidad. Una vez sellada no se puede cambiar.
          </p>
          <Button
            type="submit"
            size="block"
            className={styles.sealButton}
            disabled={pending || !valid || !affordable}
            icon={<Icon name="lock" size={18} />}
          >
            Sellar mi puja
          </Button>
        </form>
      )}
    </div>
  );
}

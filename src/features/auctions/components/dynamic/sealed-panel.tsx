import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import type { Round } from '../../model/auction';
import styles from './dynamic.module.css';

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
    <div className={styles.panel}>
      <div className={styles.envelopes} aria-label={`${count} sobres sellados`}>
        {Array.from({ length: Math.min(count, ENVELOPES_SHOWN) }, (_, index) => (
          <span key={index} className={styles.envelope} aria-hidden="true">
            🔒
          </span>
        ))}
        <span className={styles.muted}>
          {count} de {participants} ya sellaron
        </span>
      </div>

      {mine !== null ? (
        <>
          <p className={styles.label}>Tu sobre está sellado</p>
          <p className={styles.heroPrice}>
            {formatCoins(mine)}
            <small>ECI</small>
          </p>
          <p className={styles.muted}>
            No se puede cambiar. El ganador se anuncia cuando se abran los sobres.
          </p>
        </>
      ) : (
        <form
          className={styles.panel}
          style={{ padding: 0, border: 'none', background: 'none' }}
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
            <span className={styles.muted} style={{ color: 'var(--eci-yellow)' }}>
              ECI
            </span>
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
          <p className={styles.warn}>⚠ Solo una oportunidad. Una vez sellada no se puede cambiar.</p>
          <Button type="submit" size="block" disabled={pending || !valid || !affordable}>
            🔒 Sellar mi puja
          </Button>
        </form>
      )}
    </div>
  );
}

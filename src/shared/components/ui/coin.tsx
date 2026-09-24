import styles from './coin.module.css';

/**
 * Como se escribe una cifra de ECICoin en las pantallas de subasta: sin decimales cuando no
 * los hay ("1.250"), con dos cuando si. El saldo de la billetera sigue usando
 * `formatEcicoin`, que siempre muestra los dos.
 */
const SHORT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export function formatCoins(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '—';
  return SHORT.format(value);
}

/** La moneda amarilla. Decorativa: la cifra de al lado es la que informa. */
export function Coin({
  size = 16,
  flat = false,
}: {
  size?: number;
  flat?: boolean;
}) {
  return (
    <span
      className={[styles.coin, flat ? styles.flat : '']
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export type CoinAmountSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero';

const COIN_SIZE: Record<CoinAmountSize, number> = {
  sm: 13,
  md: 15,
  lg: 20,
  xl: 26,
  hero: 28,
};

/**
 * Moneda + cifra (+ la palabra ECICoin). Es la pieza con la que el diseño escribe cualquier
 * precio: en amarillo porque el amarillo es la moneda, nunca otra cosa.
 */
export function CoinAmount({
  value,
  size = 'md',
  unit = false,
  tone = 'yellow',
  className,
}: {
  value: number | string;
  size?: CoinAmountSize;
  /** Añade la palabra "ECICoin" detras de la cifra. */
  unit?: boolean;
  /** `plain`: cifra en blanco, para listas donde el amarillo competiria con lo propio. */
  tone?: 'yellow' | 'plain';
  className?: string;
}) {
  return (
    <span
      className={[styles.amount, styles[size], className]
        .filter(Boolean)
        .join(' ')}
    >
      <Coin size={COIN_SIZE[size]} flat={size === 'sm' || size === 'md'} />
      <span
        className={[styles.value, tone === 'plain' ? styles.plain : '']
          .filter(Boolean)
          .join(' ')}
      >
        {formatCoins(value)}
      </span>
      {unit ? <span className={styles.unit}>ECICoin</span> : null}
    </span>
  );
}

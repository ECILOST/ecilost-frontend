import styles from './coin.module.css';

/**
 * Como se escribe una cifra de ECICoin en las pantallas de subasta: sin decimales cuando no
 * los hay ("1.250"), con dos cuando si. Un ECICoin vale un peso y los servicios ya no
 * aceptan fracciones, asi que en la practica siempre sale entero, como en `formatEcicoin`.
 */
const SHORT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export function formatCoins(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '—';
  return SHORT.format(value);
}

/**
 * El ECICoin: una moneda de verdad y no un circulo amarillo. Canto dorado oscuro, cara
 * dorada, aro grabado y la "E" de ECICoin en relieve (sin barras: con ellas se leia como el
 * simbolo del euro). Decorativa: la cifra de al lado es la que informa.
 *
 * En tamaños pequeños (`flat`) se quitan el aro grabado y el brillo: a 13 px solo ensucian,
 * y lo que se reconoce es el canto y la letra.
 */
export function Coin({
  size = 16,
  flat = false,
  className,
}: {
  size?: number;
  flat?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={[styles.coin, className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      {/* Canto: el grosor de la moneda asoma abajo. */}
      <circle className={styles.edge} cx="16" cy="17" r="15" />
      <circle className={styles.rim} cx="16" cy="15.5" r="14.5" />
      <circle className={styles.face} cx="16" cy="15.5" r="11.5" />
      {flat ? null : (
        <>
          <circle className={styles.groove} cx="16" cy="15.5" r="9.6" />
          <path className={styles.shine} d="M8.6 10.2a9 9 0 0 1 5.2-4" />
        </>
      )}
      {/* "E" de ECICoin. */}
      <path className={styles.glyph} d="M20 9.8h-7.4v11.4H20M12.6 15.5h6" />
    </svg>
  );
}

export type CoinAmountSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero';

const COIN_SIZE: Record<CoinAmountSize, number> = {
  sm: 16,
  md: 18,
  lg: 22,
  xl: 28,
  hero: 34,
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

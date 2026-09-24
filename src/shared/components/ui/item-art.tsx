import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './icon';
import styles from './item-art.module.css';

/**
 * Pares de colores de las manchas, tal como aparecen en el diseño. Cada objeto recibe uno
 * por hash de su identificador: el catalogo se ve multicolor y cada objeto conserva sus
 * colores entre visitas.
 */
const PAIRS: Array<[string, string]> = [
  ['var(--eci-blue)', 'var(--eci-cyan)'],
  ['var(--eci-purple)', 'var(--eci-blue)'],
  ['var(--eci-pink)', 'var(--eci-yellow)'],
  ['var(--eci-cyan)', 'var(--eci-purple)'],
  ['var(--eci-yellow)', 'var(--eci-blue)'],
  ['var(--eci-blue)', 'var(--eci-pink)'],
  ['var(--eci-purple)', 'var(--eci-cyan)'],
  ['var(--eci-blue)', 'var(--eci-yellow)'],
];

function hash(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return value;
}

export function artColors(seed: string): [string, string, string, string] {
  const [c1, c2] = PAIRS[hash(seed) % PAIRS.length];
  // Los dos acentos que no estan en el par, para las piezas sueltas del collage grande.
  const extras = [
    'var(--eci-yellow)',
    'var(--eci-pink)',
    'var(--eci-cyan)',
    'var(--eci-purple)',
  ].filter((color) => color !== c1 && color !== c2);
  return [c1, c2, extras[0], extras[1]];
}

export type ItemArtVariant = 'card' | 'hero' | 'thumb' | 'plain';

/**
 * El objeto sobre su collage de manchas.
 *
 * - `card`: dos manchas grandes, para las tarjetas del catalogo.
 * - `hero`: cuatro manchas, para el objeto en subasta y la ficha.
 * - `thumb`: dos degradados radiales, para miniaturas de listas.
 * - `plain`: panel liso (sala de espera, sin objeto protagonista).
 *
 * Sin fotografia se muestra el nombre con un icono, como los marcadores del diseño. Es
 * decorativo: quien lo usa siempre escribe el nombre al lado.
 */
export function ItemArt({
  seed,
  label,
  src,
  variant = 'card',
  dimmed = false,
  className,
  children,
}: {
  seed: string;
  label: string;
  src?: string | null;
  variant?: ItemArtVariant;
  /** Atenua las manchas: sala en modo solo seguimiento. */
  dimmed?: boolean;
  className?: string;
  /** Piezas encima del arte: capsula de estado, reloj. */
  children?: ReactNode;
}) {
  const [c1, c2, c3, c4] = artColors(seed);
  const style = {
    '--c1': c1,
    '--c2': c2,
    '--c3': c3,
    '--c4': c4,
  } as CSSProperties;

  return (
    <div
      className={[
        styles.art,
        styles[variant],
        dimmed ? styles.dimmed : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {variant === 'card' || variant === 'hero' ? (
        <>
          <span className={`${styles.blob} ${styles.b1}`} aria-hidden="true" />
          <span className={`${styles.blob} ${styles.b2}`} aria-hidden="true" />
        </>
      ) : null}
      {variant === 'hero' ? (
        <>
          <span className={`${styles.blob} ${styles.b3}`} aria-hidden="true" />
          <span className={`${styles.blob} ${styles.b4}`} aria-hidden="true" />
        </>
      ) : null}

      {src ? (
        <img className={styles.image} src={src} alt={label} loading="lazy" />
      ) : variant === 'thumb' ? null : (
        // Decorativo: el nombre del objeto siempre esta escrito al lado, en su titulo.
        <span className={styles.placeholder} aria-hidden="true">
          <Icon name="image" size={variant === 'hero' ? 22 : 18} />
          <span>{label}</span>
        </span>
      )}

      {dimmed ? <span className={styles.veil} aria-hidden="true" /> : null}
      {children}
    </div>
  );
}

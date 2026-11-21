import type { ReactNode } from 'react';
import styles from './object-illustration.module.css';

/**
 * Objetos de ejemplo dibujados a mano para la portada publica. Son ilustraciones propias,
 * sin marcas ni fotografias: quien llega sin sesion todavia no ve el catalogo real, y una
 * foto de archivo de un producto con logo diria algo que la plataforma no vende.
 *
 * Un trazo de tinta y rellenos planos de la paleta decorativa, como pegatinas sobre la placa.
 */
export type ObjectKind = 'umbrella' | 'headphones' | 'bottle' | 'calculator';

export function ObjectIllustration({ kind }: { kind: ObjectKind }) {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      {DRAWINGS[kind]}
    </svg>
  );
}

const DRAWINGS: Record<ObjectKind, ReactNode> = {
  umbrella: (
    <>
      <path
        className={styles.fillPink}
        d="M14 58C16 33 36 17 60 17s44 16 46 41c-6-5-12-5-17 0-6-5-12-5-18 0-5-5-12-5-17 0-6-5-12-5-17 0-6-5-12-5-23 0z"
      />
      <path
        className={styles.fillYellow}
        d="M60 17c-10 6-15 22-12 41 4-4 9-4 12 0 3-4 8-4 12 0 3-19-2-35-12-41z"
      />
      <path className={styles.line} d="M60 17v-6" />
      <path className={styles.line} d="M60 58v38a8 8 0 0 1-16 0" />
      <path
        className={styles.outline}
        d="M14 58C16 33 36 17 60 17s44 16 46 41c-6-5-12-5-17 0-6-5-12-5-18 0-5-5-12-5-17 0-6-5-12-5-17 0-6-5-12-5-23 0z"
      />
    </>
  ),
  headphones: (
    <>
      <path className={styles.line} d="M26 70V58a34 34 0 0 1 68 0v12" />
      <rect className={styles.fillBlue} x="18" y="62" width="20" height="34" rx="10" />
      <rect className={styles.fillBlue} x="82" y="62" width="20" height="34" rx="10" />
      <rect className={styles.outline} x="18" y="62" width="20" height="34" rx="10" />
      <rect className={styles.outline} x="82" y="62" width="20" height="34" rx="10" />
      <path className={styles.lineThin} d="M26 72v16M94 72v16" />
    </>
  ),
  bottle: (
    <>
      <rect className={styles.fillTeal} x="40" y="30" width="40" height="76" rx="14" />
      <rect className={styles.fillPurple} x="40" y="54" width="40" height="22" />
      <rect className={styles.outline} x="40" y="30" width="40" height="76" rx="14" />
      <rect className={styles.fillYellow} x="46" y="12" width="28" height="18" rx="6" />
      <rect className={styles.outline} x="46" y="12" width="28" height="18" rx="6" />
      <path className={styles.lineThin} d="M40 54h40M40 76h40" />
      <path className={styles.shine} d="M50 40v8" />
    </>
  ),
  calculator: (
    <>
      <rect className={styles.fillPurple} x="28" y="12" width="64" height="96" rx="12" />
      <rect className={styles.outline} x="28" y="12" width="64" height="96" rx="12" />
      <rect className={styles.fillScreen} x="38" y="22" width="44" height="20" rx="4" />
      <rect className={styles.outline} x="38" y="22" width="44" height="20" rx="4" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            className={row === 2 && col === 2 ? styles.fillYellow : styles.fillKey}
            x={38 + col * 16}
            y={52 + row * 17}
            width="12"
            height="11"
            rx="3"
          />
        )),
      )}
    </>
  ),
};

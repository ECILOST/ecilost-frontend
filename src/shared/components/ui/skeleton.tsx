import type { CSSProperties } from 'react';
import styles from './skeleton.module.css';

/**
 * Hueco con la forma del contenido que viene.
 *
 * Es decoracion: siempre va `aria-hidden` y quien lo usa anuncia la espera por otro lado (lo
 * hace `Loading`). Reserva el espacio final, asi que al llegar los datos la pantalla no da un
 * salto (CLS).
 */
export function Skeleton({
  width = '100%',
  height = '1em',
  radius,
  className,
}: {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
}) {
  const style = { width, height, borderRadius: radius } as CSSProperties;
  return (
    <span
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}

export type SkeletonLayout = 'list' | 'cards' | 'detail';

/**
 * Las tres formas de pantalla que tiene la aplicacion: filas (salas, lotes, movimientos),
 * rejilla de tarjetas (catalogo, subastas) y ficha (objeto, sala).
 */
export function SkeletonBlock({
  layout,
  count = 3,
}: {
  layout: SkeletonLayout;
  count?: number;
}) {
  if (layout === 'detail') {
    return (
      <div className={styles.detail} aria-hidden="true">
        <Skeleton height="auto" className={styles.media} radius="var(--r-xl)" />
        <div className={styles.stack}>
          <Skeleton width="70%" height="1.75rem" />
          <Skeleton width="40%" height="1rem" />
          <Skeleton height="0.9rem" />
          <Skeleton width="90%" height="0.9rem" />
          <Skeleton
            width="10rem"
            height="var(--control-h)"
            radius="var(--r-chip)"
          />
        </div>
      </div>
    );
  }

  const rows = Array.from({ length: count }, (_, index) => index);

  if (layout === 'cards') {
    return (
      <ul className={styles.cards} aria-hidden="true">
        {rows.map((row) => (
          <li key={row} className={styles.card}>
            <Skeleton
              height="auto"
              className={styles.cardMedia}
              radius="var(--r-md)"
            />
            <Skeleton width="75%" height="1.1rem" />
            <Skeleton width="50%" height="0.85rem" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={styles.list} aria-hidden="true">
      {rows.map((row) => (
        <li key={row} className={styles.row}>
          <Skeleton width="52px" height="52px" radius="var(--r-sm)" />
          <span className={styles.stack}>
            <Skeleton width="60%" height="1rem" />
            <Skeleton width="35%" height="0.8rem" />
          </span>
        </li>
      ))}
    </ul>
  );
}

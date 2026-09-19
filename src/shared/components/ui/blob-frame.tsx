import type { ReactNode } from 'react';
import styles from './blob-frame.module.css';

/** Cada paleta son tres colores que conviven, como los collages de la referencia. */
export type BlobPalette = 1 | 2 | 3 | 4;
export type BlobShape = 'a' | 'b' | 'c';

const PALETTES: BlobPalette[] = [1, 2, 3, 4];
const SHAPES: BlobShape[] = ['a', 'b', 'c'];

/**
 * Reparte paleta y forma a partir del identificador del objeto.
 *
 * Se hace por hash y no al azar para que el catalogo se vea multicolor pero cada objeto
 * conserve sus colores entre recargas: un objeto que cambia de color en cada visita deja de
 * reconocerse de un vistazo, que es justo lo que este tratamiento venia a conseguir.
 */
export function blobSeed(seed: string): {
  palette: BlobPalette;
  shape: BlobShape;
} {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return {
    palette: PALETTES[hash % PALETTES.length],
    shape: SHAPES[(hash >>> 3) % SHAPES.length],
  };
}

export interface BlobFrameProps {
  src?: string | null;
  /** Obligatorio cuando hay imagen. Sin ella el marco es decoracion y se oculta. */
  alt?: string;
  palette?: BlobPalette;
  shape?: BlobShape;
  size?: 'sm' | 'md' | 'lg';
  /** `contain` para objetos recortados, `cover` para fotografias reales. */
  fit?: 'contain' | 'cover';
  /** Que mostrar cuando no hay imagen: una inicial, un glifo. */
  fallback?: ReactNode;
  className?: string;
}

export function BlobFrame({
  src,
  alt = '',
  palette = 1,
  shape = 'a',
  size = 'md',
  fit = 'contain',
  fallback,
  className,
}: BlobFrameProps) {
  return (
    <div
      className={[
        styles.frame,
        styles[size],
        styles[`palette-${palette}`],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-shape={shape}
    >
      <span className={styles.halo} aria-hidden="true" />
      <span className={styles.blobA} aria-hidden="true" />
      <span className={styles.blobB} aria-hidden="true" />
      <span className={styles.chip} aria-hidden="true" />
      {src ? (
        <img
          className={`${styles.image} ${styles[fit]}`}
          src={src}
          alt={alt}
          loading="lazy"
        />
      ) : (
        <span className={styles.fallback} aria-hidden="true">
          {fallback}
        </span>
      )}
    </div>
  );
}

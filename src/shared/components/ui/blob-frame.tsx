import type { ReactNode } from 'react';
import styles from './blob-frame.module.css';

export type BlobTone = 'mint' | 'coral' | 'amber' | 'blue' | 'violet';
export type BlobShape = 'a' | 'b' | 'c';

const TONES: BlobTone[] = ['mint', 'coral', 'amber', 'blue', 'violet'];
const SHAPES: BlobShape[] = ['a', 'b', 'c'];

/**
 * Reparte color y forma a partir del identificador del objeto.
 *
 * Se hace por hash y no al azar para que el catalogo se vea multicolor pero cada objeto
 * conserve su color entre recargas: un objeto que cambia de color en cada visita deja de
 * reconocerse de un vistazo, que es justo lo que este tratamiento venia a conseguir.
 */
export function blobSeed(seed: string): { tone: BlobTone; shape: BlobShape } {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return {
    tone: TONES[hash % TONES.length],
    shape: SHAPES[(hash >>> 3) % SHAPES.length],
  };
}

export interface BlobFrameProps {
  src?: string | null;
  /** Obligatorio cuando hay imagen. Sin ella el marco es decoracion y se oculta. */
  alt?: string;
  tone?: BlobTone;
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
  tone = 'mint',
  shape = 'a',
  size = 'md',
  fit = 'contain',
  fallback,
  className,
}: BlobFrameProps) {
  return (
    <div
      className={[styles.frame, styles[size], styles[`tone-${tone}`], className]
        .filter(Boolean)
        .join(' ')}
      data-shape={shape}
    >
      <span className={styles.halo} aria-hidden="true" />
      <span className={styles.blob} aria-hidden="true" />
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

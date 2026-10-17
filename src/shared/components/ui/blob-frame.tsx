import { useState, type CSSProperties, type ReactNode } from 'react';
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
  /**
   * `contain` para objetos recortados (respiran dentro de la placa), `cover` para fotografias
   * reales (llenan la placa). En los dos casos la foto se ve entera: nunca se recorta.
   */
  fit?: 'contain' | 'cover';
  /** Que mostrar cuando no hay imagen: una inicial, un glifo. */
  fallback?: ReactNode;
  className?: string;
}

/** Lo mas alargada que puede ser la placa: mas alla romperia la composicion de la tarjeta. */
export const MIN_PLATE_RATIO = 3 / 4;
export const MAX_PLATE_RATIO = 4 / 3;

/**
 * Proporcion de la placa para una foto: la de la foto, dentro de [3:4, 4:3]. Una foto de
 * celular (3:4) o de camara (4:3) llena su placa sin recortarse; una panoramica queda entera
 * dentro de una placa 4:3, con margen, en vez de perder dos tercios.
 */
export function plateRatio(photoRatio: number): number {
  if (!Number.isFinite(photoRatio) || photoRatio <= 0) return 1;
  return Math.min(MAX_PLATE_RATIO, Math.max(MIN_PLATE_RATIO, photoRatio));
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
  // Un enlace firmado vencido responde 403: en vez de una imagen rota vuelve el collage con
  // la inicial. Se recuerda que URL fallo, asi que un enlace nuevo se vuelve a intentar.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const photo = src && src !== failedSrc ? src : null;
  // Proporcion de la foto que se cargo, para que la placa tome su forma (ver `plateRatio`).
  const [loaded, setLoaded] = useState<{ src: string; ratio: number } | null>(
    null,
  );
  const ratio = plateRatio(loaded?.src === photo ? loaded.ratio : 1);

  return (
    <div
      className={[
        styles.frame,
        styles[size],
        styles[`palette-${palette}`],
        photo ? styles.withPhoto : '',
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
      {photo ? (
        /*
         * La fotografia va en una placa de esquinas suaves y no recortada con la forma de la
         * mancha: las fotos de producto traen su propio fondo (casi siempre blanco), y al
         * recortarlas en mancha tapaban el color y dejaban bordes sueltos que no coincidian.
         * Las manchas pasan detras y asoman por dos esquinas.
         */
        <span
          className={styles.plate}
          data-orientation={ratio >= 1 ? 'landscape' : 'portrait'}
          style={{ '--plate-ratio': ratio } as CSSProperties}
        >
          <img
            className={`${styles.image} ${styles[fit]}`}
            src={photo}
            alt={alt}
            loading="lazy"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight)
                setLoaded({ src: photo, ratio: naturalWidth / naturalHeight });
            }}
            onError={() => setFailedSrc(photo)}
          />
        </span>
      ) : (
        <span className={styles.fallback} aria-hidden="true">
          {fallback}
        </span>
      )}
    </div>
  );
}

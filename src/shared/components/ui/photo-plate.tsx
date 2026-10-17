import { useState, type CSSProperties } from 'react';
import styles from './photo-plate.module.css';

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

/**
 * Como se mide la placa dentro de quien la contiene:
 *
 * - `frame`: marco cuadrado (catalogo). El lado largo de la placa ocupa el 74% del marco.
 * - `box`: recuadro mas ancho que alto (subastas). La placa ocupa el 74% del alto.
 * - `thumb`: miniatura de lista. Casi todo el recuadro, sin aro ni sombra.
 */
export type PhotoPlateSize = 'frame' | 'box' | 'thumb';

export interface PhotoPlateProps {
  src: string;
  alt: string;
  size: PhotoPlateSize;
  /**
   * `contain` para objetos recortados (respiran dentro de la placa), `cover` para fotografias
   * reales (llenan la placa). En los dos casos la foto se ve entera: nunca se recorta.
   */
  fit?: 'contain' | 'cover';
  /** El enlace no cargo (firma vencida, 403): quien la usa vuelve a su marcador. */
  onError: () => void;
  className?: string;
}

/**
 * La fotografia de un objeto, sobre una placa de esquinas suaves que toma su forma.
 *
 * Es la misma en el catalogo y en las subastas: las fotos de producto traen su propio fondo
 * (casi siempre blanco), y recortarlas con la forma de las manchas tapaba el color y dejaba
 * bordes sueltos. Aqui la foto va entera en su placa y las manchas quedan detras.
 */
export function PhotoPlate({
  src,
  alt,
  size,
  fit = 'cover',
  onError,
  className,
}: PhotoPlateProps) {
  // Proporcion de la foto que se cargo, para que la placa tome su forma (ver `plateRatio`).
  const [loaded, setLoaded] = useState<{ src: string; ratio: number } | null>(
    null,
  );
  const ratio = plateRatio(loaded?.src === src ? loaded.ratio : 1);

  return (
    <span
      className={[styles.plate, styles[size], className]
        .filter(Boolean)
        .join(' ')}
      data-orientation={ratio >= 1 ? 'landscape' : 'portrait'}
      style={{ '--plate-ratio': ratio } as CSSProperties}
    >
      <img
        className={`${styles.image} ${styles[fit]}`}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight)
            setLoaded({ src, ratio: naturalWidth / naturalHeight });
        }}
        onError={onError}
      />
    </span>
  );
}

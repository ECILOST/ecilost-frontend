import { useState, type ReactNode } from 'react';
import {
  BlobFrame,
  type BlobPalette,
  type BlobShape,
} from '@/shared/components/ui/blob-frame';
import { Pill } from '@/shared/components/ui/pill';
import { photoAlt } from '../domain/media-text';
import type { MediaAsset } from '../model/media';
import styles from './media-viewer.module.css';

export interface MediaViewerProps<P extends MediaAsset = MediaAsset> {
  /** Ya vienen ordenadas por `position` desde el servicio. */
  photos: P[];
  video: MediaAsset | null;
  palette: BlobPalette;
  shape: BlobShape;
  /** Que mostrar mientras el objeto no tenga fotografias. */
  fallback: ReactNode;
  /** Distintivo que flota sobre la imagen, normalmente el estado del objeto. */
  badge?: ReactNode;
  /** Nombre accesible de cada fotografia; por defecto, su lugar en la galeria del objeto. */
  describe?: (photo: P) => string;
  /** Leyenda bajo la fotografia grande, por ejemplo el objeto al que pertenece. */
  caption?: (photo: P) => ReactNode;
  /** Que decir mientras no hay ni fotografias ni video. */
  emptyText?: string;
}

/**
 * Multimedia del objeto (HU-08): la fotografia grande, la fila de miniaturas y el video.
 *
 * Las URL vienen firmadas dentro de la ficha y caducan a los quince minutos: se pintan
 * directo desde la respuesta y no se copian a estado propio. Lo unico que se guarda aqui es
 * cual esta seleccionada, que es un indice y no un enlace.
 */
export function MediaViewer<P extends MediaAsset>({
  photos,
  video,
  palette,
  shape,
  fallback,
  badge,
  describe = photoAlt,
  caption,
  emptyText = 'Este objeto todavía no tiene fotografías ni video',
}: MediaViewerProps<P>) {
  const [selected, setSelected] = useState(0);
  const current = photos[selected] ?? photos[0];

  return (
    <section className={styles.viewer}>
      <div className={styles.stage}>
        {badge ? <span className={styles.badge}>{badge}</span> : null}

        <BlobFrame
          size="lg"
          palette={palette}
          shape={shape}
          src={current?.url}
          alt={current ? describe(current) : ''}
          fit="cover"
          fallback={fallback}
        />

        {photos.length === 0 && !video ? (
          <p className={styles.empty}>{emptyText}</p>
        ) : null}
      </div>

      {current && caption ? (
        <div className={styles.caption}>{caption(current)}</div>
      ) : null}

      {/*
        Con una sola fotografia la fila de miniaturas no decide nada, asi que no se pinta:
        seria un control que no lleva a ninguna parte.
      */}
      {photos.length > 1 ? (
        <div className={styles.thumbs}>
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              className={[
                styles.thumb,
                index === selected ? styles.selected : '',
              ]
                .filter(Boolean)
                .join(' ')}
              // El nombre accesible lo da el boton; la miniatura es decoracion suya.
              aria-label={`Ver ${lowerFirst(describe(photo))}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              <img src={photo.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      {video ? (
        <div className={styles.video}>
          <Pill className={styles.videoTag} tone="pink" solid dot>
            Video
          </Pill>
          {/* Sin `autoPlay`: el video del objeto lo pide la persona, no la pagina. */}
          <video src={video.url} controls preload="metadata" />
        </div>
      ) : null}
    </section>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

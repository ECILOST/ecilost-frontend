import { EmptyState } from '@/shared/components/empty-state';
import { BlobFrame, blobSeed } from '@/shared/components/ui/blob-frame';
import { Pill } from '@/shared/components/ui/pill';
import { photoAlt } from '../domain/media-text';
import type { MediaAsset } from '../model/media';
import styles from './media-gallery.module.css';

/**
 * Fotografias y video del objeto (HU-08).
 *
 * Las URL vienen firmadas dentro de la respuesta y caducan: se pintan directo desde ella y
 * no se copian a estado propio, porque un enlace guardado deja de servir a los quince
 * minutos y la imagen se rompe sin decir por que.
 */
export function MediaGallery({
  photos,
  video,
  title = 'Cómo se ve',
}: {
  photos: MediaAsset[];
  video: MediaAsset | null;
  title?: string;
}) {
  if (photos.length === 0 && !video) {
    return (
      <EmptyState title="Este objeto todavía no tiene fotografías ni video" />
    );
  }

  return (
    <section className={styles.gallery}>
      <h2 className={styles.heading}>{title}</h2>

      {photos.length ? (
        <ul className={styles.photos}>
          {photos.map((photo) => {
            const { tone, shape } = blobSeed(photo.id);
            return (
              <li key={photo.id}>
                <BlobFrame
                  src={photo.url}
                  alt={photoAlt(photo)}
                  tone={tone}
                  shape={shape}
                  fit="cover"
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      {video ? (
        <div className={styles.video}>
          <Pill className={styles.videoTag} tone="coral" dot>
            Video
          </Pill>
          {/* Sin `autoPlay`: el video del objeto lo pide la persona, no la pagina. */}
          <video src={video.url} controls preload="metadata" />
        </div>
      ) : null}
    </section>
  );
}

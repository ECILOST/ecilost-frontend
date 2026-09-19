import { useId, useState, type ChangeEvent } from 'react';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Icon } from '@/shared/components/ui/icon';
import { Notice } from '@/shared/components/ui/notice';
import { formatBytes } from '@/shared/format/bytes';
import { photoAlt } from '../domain/media-text';
import { useRemoveMedia } from '../hooks/use-remove-media';
import { useUploadMedia } from '../hooks/use-upload-media';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_ITEM,
  MAX_VIDEO_BYTES,
  MediaKind,
  type MediaAsset,
} from '../model/media';
import styles from './media-manager.module.css';

/*
 * Lo que se le sugiere al selector de archivos del sistema. Es solo un filtro de comodidad:
 * el tipo de verdad lo decide el servicio leyendo los primeros bytes, asi que esta lista no
 * protege de nada y no pretende hacerlo.
 */
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const VIDEO_ACCEPT = 'video/mp4,video/webm';

/**
 * Administracion de la multimedia de un objeto (HU-07).
 *
 * Vive dentro de la ficha y no en una pantalla aparte porque adjuntar una fotografia es
 * mirar el objeto y decidir que le falta: separarlo obligaria a ir y volver para comprobar
 * que quedo bien.
 *
 * Solo se pinta para quien administra el catalogo. Esconderlo no autoriza nada: los dos
 * endpoints siguen exigiendo el rol, y esto unicamente evita ofrecer un boton cuyo unico
 * resultado posible seria un 403.
 */
export function MediaManager({
  itemId,
  photos,
  video,
}: {
  itemId: string;
  photos: MediaAsset[];
  video: MediaAsset | null;
}) {
  const titleId = useId();
  const { upload, progress, report, busy, dismiss } = useUploadMedia(itemId);
  const remove = useRemoveMedia(itemId);

  /** La pieza que se va a quitar, mientras se confirma. `null` = no hay nada que confirmar. */
  const [pending, setPending] = useState<MediaAsset | null>(null);

  const full = photos.length >= MAX_PHOTOS_PER_ITEM;
  const room = MAX_PHOTOS_PER_ITEM - photos.length;

  function pick(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);
    // El campo se vacia enseguida: sin esto, volver a elegir el mismo archivo no dispara
    // ningun cambio y parece que la aplicacion lo ignoro.
    event.target.value = '';
    if (files.length > 0) void upload(files);
  }

  function confirmRemoval(): void {
    if (!pending) return;
    remove.mutate(pending.id, { onSettled: () => setPending(null) });
  }

  return (
    <section className={styles.manager} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        Multimedia
      </h2>

      <p className={styles.hint}>
        Fotografías JPEG, PNG o WebP de hasta {formatBytes(MAX_PHOTO_BYTES)},
        hasta {MAX_PHOTOS_PER_ITEM} por objeto. Un solo vídeo, MP4 o WebM, de
        hasta {formatBytes(MAX_VIDEO_BYTES)}.
      </p>

      {/*
        El progreso se anuncia sin robar el foco. Va por archivo y no como una barra del
        total porque lo que se sabe es cuantos van, no cuantos bytes llevan: el navegador no
        informa del avance de una subida sin cambiar `fetch` por XHR.
      */}
      {progress ? (
        <p className={styles.progress} role="status">
          Subiendo {progress.done + 1} de {progress.total}: {progress.name}
        </p>
      ) : null}

      {report ? (
        <Notice
          tone={report.rejected.length > 0 ? 'alert' : 'success'}
          live="status"
          title={reportTitle(report.uploaded, report.rejected.length)}
          details={report.rejected.map(
            (file) => `${file.name}: ${file.reason}`,
          )}
          actions={
            <Button variant="quiet" onClick={dismiss}>
              Entendido
            </Button>
          }
        >
          {report.stopped
            ? 'Se detuvo ahí: los archivos que quedaban iban a ser rechazados por el mismo motivo.'
            : null}
        </Notice>
      ) : null}

      {remove.isError ? (
        <Notice tone="alert" live="alert" title="No se pudo quitar la pieza">
          Vuelve a intentarlo. Si insiste, recarga la ficha: puede que ya no
          estuviera ahí.
        </Notice>
      ) : null}

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>
          Fotografías
          <span className={styles.count}>
            {photos.length} de {MAX_PHOTOS_PER_ITEM}
          </span>
        </h3>

        <ul className={styles.grid}>
          {photos.map((photo) => (
            <li className={styles.piece} key={photo.id}>
              <img src={photo.url} alt={photoAlt(photo)} loading="lazy" />
              <button
                type="button"
                className={styles.remove}
                aria-label={`Quitar ${photoAlt(photo).toLowerCase()}`}
                disabled={busy || remove.isPending}
                onClick={() => setPending(photo)}
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}

          {full ? null : (
            <li>
              {/*
                Es un `<input type="file">` de verdad con la piel de un boton, no un boton
                que abre un selector por JavaScript: asi conserva el teclado y se anuncia
                como lo que es. El anillo de foco lo dibuja la etiqueta, porque el campo
                esta oculto.
              */}
              <label
                className={`${styles.picker} ${buttonClass('secondary')} ${
                  busy ? styles.waiting : ''
                }`}
              >
                <Icon name="upload" size={18} />
                {photos.length === 0 ? 'Añadir fotografías' : 'Añadir más'}
                <input
                  className="u-sr-only"
                  type="file"
                  multiple
                  accept={PHOTO_ACCEPT}
                  disabled={busy}
                  onChange={pick}
                />
              </label>
            </li>
          )}
        </ul>

        <p className={styles.room}>
          {full
            ? 'Este objeto llegó al tope. Quita alguna para poder añadir otra.'
            : `Caben ${room} ${room === 1 ? 'fotografía' : 'fotografías'} más, y puedes elegir varias a la vez.`}
        </p>
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Vídeo</h3>

        {video ? (
          <div className={styles.videoRow}>
            <span className={styles.videoName}>
              Vídeo adjunto · {formatBytes(video.sizeBytes)}
            </span>
            <Button
              variant="danger"
              disabled={busy || remove.isPending}
              icon={<Icon name="trash" size={16} />}
              onClick={() => setPending(video)}
            >
              Quitar vídeo
            </Button>
          </div>
        ) : (
          <label
            className={`${styles.picker} ${buttonClass('secondary')} ${
              busy ? styles.waiting : ''
            }`}
          >
            <Icon name="upload" size={18} />
            Subir vídeo
            <input
              className="u-sr-only"
              type="file"
              accept={VIDEO_ACCEPT}
              disabled={busy}
              onChange={pick}
            />
          </label>
        )}

        {video ? null : (
          <p className={styles.room}>
            El objeto admite uno. Para cambiarlo, primero hay que quitar el que
            tenga.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === MediaKind.VIDEO
            ? '¿Quitar el vídeo?'
            : '¿Quitar la fotografía?'
        }
        confirmLabel="Quitar"
        busy={remove.isPending}
        onConfirm={confirmRemoval}
        onCancel={() => setPending(null)}
      >
        Desaparece de la ficha y no se puede deshacer. El resto de la
        multimedia del objeto no se toca.
      </ConfirmDialog>
    </section>
  );
}

/** El titular del informe. Lo primero que hay que saber es cuantas entraron. */
function reportTitle(uploaded: number, rejected: number): string {
  if (rejected === 0) {
    return uploaded === 1
      ? 'Se adjuntó 1 archivo'
      : `Se adjuntaron ${uploaded} archivos`;
  }
  if (uploaded === 0) {
    return rejected === 1
      ? 'No se pudo adjuntar el archivo'
      : 'No se pudo adjuntar ninguno';
  }
  return `Se adjuntaron ${uploaded}, y ${rejected} no`;
}

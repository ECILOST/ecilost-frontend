import { useId, useState, type ChangeEvent } from 'react';
import styles from '@/features/media/components/media-manager.module.css';
import { MAX_PHOTO_BYTES } from '@/features/media/model/media';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Icon } from '@/shared/components/ui/icon';
import { Notice } from '@/shared/components/ui/notice';
import { formatBytes } from '@/shared/format/bytes';
import { useRemoveLotPhoto, useUploadLotPhotos } from '../hooks/use-lot-photos';
import { MAX_PHOTOS_PER_LOT, type LotPhoto } from '../model/lot';

/** Filtro de comodidad del selector: el tipo de verdad lo decide el servicio por los bytes. */
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Administracion de las fotografias de un lote. Es la misma pieza que la multimedia de un
 * objeto (mismos estilos, misma subida por tandas), sin video: un lote solo lleva fotos.
 *
 * Solo se pinta para quien administra el catalogo. Esconderlo no autoriza nada: los dos
 * endpoints siguen exigiendo el rol.
 */
export function LotPhotoManager({
  lotId,
  photos,
}: {
  lotId: string;
  photos: LotPhoto[];
}) {
  const titleId = useId();
  const { upload, progress, report, busy, dismiss } = useUploadLotPhotos(lotId);
  const remove = useRemoveLotPhoto(lotId);
  const [pending, setPending] = useState<LotPhoto | null>(null);

  const full = photos.length >= MAX_PHOTOS_PER_LOT;
  const room = MAX_PHOTOS_PER_LOT - photos.length;

  function pick(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);
    // Se vacia enseguida: si no, volver a elegir el mismo archivo no dispara ningun cambio.
    event.target.value = '';
    if (files.length > 0) void upload(files);
  }

  return (
    <section className={styles.manager} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        Fotografías del lote
      </h2>

      <p className={styles.hint}>
        La primera es la portada del lote en el catálogo y en la subasta. JPEG,
        PNG o WebP de hasta {formatBytes(MAX_PHOTO_BYTES)}, hasta{' '}
        {MAX_PHOTOS_PER_LOT} por lote.
      </p>

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
        <Notice
          tone="alert"
          live="alert"
          title="No se pudo quitar la fotografía"
        >
          Vuelve a intentarlo. Si insiste, recarga el lote: puede que ya no
          estuviera ahí.
        </Notice>
      ) : null}

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>
          Fotografías
          <span className={styles.count}>
            {photos.length} de {MAX_PHOTOS_PER_LOT}
          </span>
        </h3>

        <ul className={styles.grid}>
          {photos.map((photo, index) => (
            <li className={styles.piece} key={photo.id}>
              <img src={photo.url} alt={lotPhotoAlt(index)} loading="lazy" />
              <button
                type="button"
                className={styles.remove}
                aria-label={`Quitar ${lotPhotoAlt(index).toLowerCase()}`}
                disabled={busy || remove.isPending}
                onClick={() => setPending(photo)}
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}

          {full ? null : (
            <li>
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
            ? 'Este lote llegó al tope. Quita alguna para poder añadir otra.'
            : `Caben ${room} ${room === 1 ? 'fotografía' : 'fotografías'} más, y puedes elegir varias a la vez.`}
        </p>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="¿Quitar la fotografía?"
        confirmLabel="Quitar"
        busy={remove.isPending}
        onConfirm={() => {
          if (pending)
            remove.mutate(pending.id, { onSettled: () => setPending(null) });
        }}
        onCancel={() => setPending(null)}
      >
        Desaparece del lote y no se puede deshacer. Las demás fotografías no se
        tocan.
      </ConfirmDialog>
    </section>
  );
}

/** "Portada del lote", "Fotografía 2 del lote"... Lo mismo para la imagen y para su boton. */
export function lotPhotoAlt(index: number): string {
  return index === 0 ? 'Portada del lote' : `Fotografía ${index + 1} del lote`;
}

function reportTitle(uploaded: number, rejected: number): string {
  if (rejected === 0) {
    return uploaded === 1
      ? 'Se adjuntó 1 fotografía'
      : `Se adjuntaron ${uploaded} fotografías`;
  }
  if (uploaded === 0) {
    return rejected === 1
      ? 'No se pudo adjuntar la fotografía'
      : 'No se pudo adjuntar ninguna';
  }
  return `Se adjuntaron ${uploaded}, y ${rejected} no`;
}

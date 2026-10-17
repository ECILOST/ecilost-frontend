import { useCallback, useState } from 'react';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import { formatBytes } from '@/shared/format/bytes';
import { MediaKind, maxBytesFor } from '../model/media';

/** Por donde va la subida. `null` cuando no hay ninguna en marcha. */
export interface UploadProgress {
  /** Cuantos archivos se han intentado ya. */
  done: number;
  total: number;
  /** El que se esta subiendo ahora, por su nombre en el disco. */
  name: string;
}

export interface RejectedFile {
  name: string;
  reason: string;
}

/** Como acabo la tanda. Es lo que se le cuenta a la persona cuando termina. */
export interface UploadReport {
  uploaded: number;
  rejected: RejectedFile[];
  /** Cierto cuando se corto la tanda porque seguir no podia salir mejor. */
  stopped: boolean;
}

/** De quien es la multimedia, para nombrarlo en los motivos de rechazo: "el objeto", "el lote". */
export type UploadOwner = 'objeto' | 'lote';

/**
 * Subir varios archivos, uno por peticion, encadenados. Lo comparten los objetos (HU-07) y los
 * lotes.
 *
 * Van encadenados y no en paralelo por dos razones: el servicio calcula la posicion de cada
 * foto contando las que ya hay, y contar a la vez desde dos peticiones deja dos fotos en el
 * mismo sitio; y porque asi se puede parar en cuanto se llega al tope, en vez de disparar
 * peticiones que ya se sabe que van a fallar.
 *
 * `onUploaded` corre una sola vez al final, si entro al menos uno: quien lo usa relee su
 * ficha, porque cada pieza trae una URL firmada que solo emite el servicio.
 */
export function useSequentialUpload({
  send,
  onUploaded,
  owner,
}: {
  send: (file: File) => Promise<unknown>;
  onUploaded: () => Promise<unknown>;
  owner: UploadOwner;
}) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [report, setReport] = useState<UploadReport | null>(null);

  const upload = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;

      setReport(null);
      const rejected: RejectedFile[] = [];
      let uploaded = 0;
      let stopped = false;

      for (const [index, file] of files.entries()) {
        setProgress({ done: index, total: files.length, name: file.name });

        // Lo que se puede rechazar sin gastar la subida, se rechaza aqui. Subir cien
        // megabytes para que el servicio conteste que sobran noventa y cinco es tiempo de
        // la persona, no del servidor.
        const limit = maxBytesFor(declaredKind(file));
        if (file.size > limit) {
          rejected.push({
            name: file.name,
            reason: `pesa ${formatBytes(file.size)} y el máximo es ${formatBytes(limit)}`,
          });
          continue;
        }

        try {
          await send(file);
          uploaded += 1;
        } catch (error) {
          rejected.push({
            name: file.name,
            reason: failureReason(error, owner),
          });
          if (isPointlessToContinue(error)) {
            stopped = true;
            break;
          }
        }
      }

      setProgress(null);
      if (uploaded > 0) await onUploaded();
      setReport({ uploaded, rejected, stopped });
    },
    [send, onUploaded, owner],
  );

  return {
    upload,
    progress,
    report,
    busy: progress !== null,
    dismiss: useCallback(() => setReport(null), []),
  };
}

/**
 * De que tipo dice ser el archivo, segun el navegador.
 *
 * Solo sirve para elegir contra que tope compararlo antes de subirlo. El tipo de verdad lo
 * decide el servicio leyendo los primeros bytes, precisamente porque esto lo escribe el
 * cliente y renombrar un archivo bastaria para mentir.
 */
function declaredKind(file: File): MediaKind {
  return file.type.startsWith('video/') ? MediaKind.VIDEO : MediaKind.PHOTO;
}

/**
 * Por que se rechazo un archivo, en una frase que encaja detras de su nombre:
 * "retrato.bmp: no es un formato admitido".
 *
 * Se traduce por `type` en vez de reenviar el `detail` del servicio porque sus mensajes van
 * sin tildes, como todo el texto interno del back. Un tipo no previsto si usa lo que dijo el
 * servicio: un motivo raro en su idioma dice mas que un "no se pudo" que no dice nada.
 */
function failureReason(error: unknown, owner: UploadOwner): string {
  if (!(error instanceof ApiError)) return 'no se pudo subir';

  switch (error.problem.type) {
    case ProblemType.UNSUPPORTED_MEDIA:
      return 'no es un formato admitido';
    case ProblemType.MEDIA_TOO_LARGE:
      return 'pesa más de lo permitido';
    case ProblemType.VIDEO_ALREADY_EXISTS:
      return `el ${owner} ya tiene un vídeo`;
    case ProblemType.PHOTO_LIMIT_REACHED:
      return `el ${owner} llegó al tope de fotografías`;
    case ProblemType.FORBIDDEN:
      return 'tu rol no permite adjuntar multimedia';
    case ProblemType.NOT_FOUND:
      return `el ${owner} ya no existe`;
    default:
      return error.problem.detail ?? 'no se pudo subir';
  }
}

/**
 * Cierto cuando insistir con los archivos que quedan no puede salir mejor: se llego al tope,
 * ya hay video, el dueño desaparecio, o quien sube no tiene permiso. Los demas rechazos son
 * del archivo concreto, asi que el siguiente todavia tiene su oportunidad.
 */
function isPointlessToContinue(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.is(ProblemType.PHOTO_LIMIT_REACHED) ||
      error.is(ProblemType.VIDEO_ALREADY_EXISTS) ||
      error.is(ProblemType.FORBIDDEN) ||
      error.is(ProblemType.NOT_FOUND))
  );
}

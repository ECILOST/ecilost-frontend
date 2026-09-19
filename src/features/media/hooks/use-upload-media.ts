import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useContainer } from '@/app/providers/container-provider';
import { itemKeys } from '@/features/catalog/hooks/use-items';
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

/**
 * Caso de uso "adjuntar multimedia a un objeto" (HU-07).
 *
 * El endpoint acepta **un archivo por peticion**, asi que subir varias fotografias son
 * varias peticiones. Van encadenadas y no en paralelo por dos razones: el servicio calcula
 * la posicion de cada foto contando las que ya hay, y contar a la vez desde dos peticiones
 * deja dos fotos en el mismo sitio; y porque asi se puede parar en cuanto el objeto llega al
 * tope, en vez de disparar diez peticiones que ya se sabe que van a fallar.
 *
 * Al terminar invalida la ficha en vez de insertar las piezas en la cache a mano: cada una
 * necesita una URL firmada que solo emite el servicio, asi que lo unico correcto es volver
 * a leer. Se invalida una sola vez al final y no por archivo, para no releer la ficha entera
 * cinco veces seguidas.
 */
export function useUploadMedia(itemId: string) {
  const { media } = useContainer();
  const queryClient = useQueryClient();
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
          await media.upload(itemId, file);
          uploaded += 1;
        } catch (error) {
          rejected.push({ name: file.name, reason: failureReason(error) });
          if (isPointlessToContinue(error)) {
            stopped = true;
            break;
          }
        }
      }

      setProgress(null);
      if (uploaded > 0) {
        await queryClient.invalidateQueries({
          queryKey: itemKeys.detail(itemId),
        });
      }
      setReport({ uploaded, rejected, stopped });
    },
    [itemId, media, queryClient],
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
function failureReason(error: unknown): string {
  if (!(error instanceof ApiError)) return 'no se pudo subir';

  switch (error.problem.type) {
    case ProblemType.UNSUPPORTED_MEDIA:
      return 'no es un formato admitido';
    case ProblemType.MEDIA_TOO_LARGE:
      return 'pesa más de lo permitido';
    case ProblemType.VIDEO_ALREADY_EXISTS:
      return 'el objeto ya tiene un vídeo';
    case ProblemType.PHOTO_LIMIT_REACHED:
      return 'el objeto llegó al tope de fotografías';
    case ProblemType.FORBIDDEN:
      return 'tu rol no permite adjuntar multimedia';
    case ProblemType.NOT_FOUND:
      return 'el objeto ya no existe';
    default:
      return error.problem.detail ?? 'no se pudo subir';
  }
}

/**
 * Cierto cuando insistir con los archivos que quedan no puede salir mejor: el objeto llego
 * al tope, ya tiene video, desaparecio, o quien sube no tiene permiso. Los demas rechazos
 * son del archivo concreto, asi que el siguiente todavia tiene su oportunidad.
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

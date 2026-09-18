/**
 * Contrato de multimedia de ecilost-catalog-service (HU-07, HU-08).
 */

export const MediaKind = {
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
} as const;

export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

/**
 * Una pieza multimedia de la ficha, tal como la publica el servicio.
 *
 * `storageKey` no existe aqui porque tampoco existe en la respuesta: la ruta interna del
 * almacen no sale, para que nadie arme enlaces a mano en vez de usar los firmados.
 */
export interface MediaAsset {
  id: string;
  kind: MediaKind;
  /** Tipo real, deducido de los bytes al subir, no del que declaro el navegador. */
  contentType: string;
  sizeBytes: number;
  /** Lugar en la galeria. Las fotografias llegan ya ordenadas por el. */
  position: number;
  /**
   * Enlace de lectura firmado y de vida corta (quince minutos).
   *
   * Caduca, asi que no sirve guardarlo en estado propio ni compartirlo: para obtener uno
   * nuevo hay que releer la ficha. Por eso las imagenes se pintan directo desde la
   * respuesta y no se cachean mas alla de la consulta.
   */
  url: string;
  uploadedAt: string;
}

/** Limites que aplica el servicio. Duplicarlos aqui evita subir lo que se va a rechazar. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_PHOTOS_PER_ITEM = 10;

export function maxBytesFor(kind: MediaKind): number {
  return kind === MediaKind.VIDEO ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
}

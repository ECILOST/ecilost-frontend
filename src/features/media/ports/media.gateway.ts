import type { MediaAsset } from '../model/media';

/**
 * Multimedia de un objeto (HU-07).
 *
 * Aqui solo estan las operaciones de escritura porque la lectura no tiene endpoint propio:
 * las fotografias y el video llegan dentro de la ficha (`GET /items/:id`), ya con sus URL
 * firmadas. Pedirlas aparte obligaria a firmar dos veces lo mismo.
 */
export interface MediaGateway {
  /**
   * `POST /items/:itemId/media`. Operacion de funcionario.
   *
   * El servicio deduce el tipo de los primeros bytes del archivo, no de la extension ni del
   * `Content-Type` declarado: los dos los escribe quien sube, asi que renombrar un archivo
   * bastaria para saltarse la validacion.
   */
  upload(itemId: string, file: File): Promise<MediaAsset>;

  /** `DELETE /items/:itemId/media/:mediaId`. Operacion de funcionario. */
  remove(itemId: string, mediaId: string): Promise<void>;
}

import type { LotStatus } from '../domain/lot-status';

/**
 * Contratos de lotes de ecilost-catalog-service (HU-05, HU-06), tal como viajan por la red.
 *
 * Las fechas son `string` y no `Date` por lo mismo que en el catalogo: el servicio las
 * declara `Date`, pero JSON no tiene fechas y lo que llega es una cadena ISO.
 */

/**
 * Un objeto dentro de un lote, tal como lo publica el lote.
 *
 * Solo trae identificador y nombre: `toLotResponse` recorta cada objeto a esos dos campos.
 * Para ver la ficha entera hay que ir a `GET /items/:id`, y por eso las filas del lote
 * enlazan al catalogo en vez de intentar pintar el objeto aqui.
 */
export interface LotItem {
  id: string;
  name: string;
}

export interface Lot {
  id: string;
  name: string;
  status: LotStatus;
  /** Ya ordenados por antiguedad de registro, como los devuelve el servicio. */
  items: LotItem[];
  /** userId del funcionario que lo armo. No hay nombre: el catalogo no conoce identidades. */
  createdBy: string;
  createdAt: string;
}

/** Cuantos objetos exige el servicio como minimo. Un lote de uno no agrupa nada. */
export const MIN_LOT_ITEMS = 2;

export const LOT_NAME_MAX = 120;

/**
 * Cuerpo de `POST /lots`. Operacion de funcionario.
 *
 * Los objetos se nombran al crear el lote y no despues, porque no existe forma de añadirlos
 * ni de quitarlos: el servicio no publica ni `PATCH` ni `DELETE` de lotes.
 */
export interface CreateLotRequest {
  name: string;
  /** Al menos dos, sin repetir, y todos disponibles en el momento de la peticion. */
  itemIds: string[];
}

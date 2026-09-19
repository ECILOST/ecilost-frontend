import type { MediaAsset } from '@/features/media/model/media';
import type { ItemCondition } from '../domain/item-condition';
import type { ItemStatus } from '../domain/item-status';

/**
 * Contratos de objetos de ecilost-catalog-service, tal como viajan por la red.
 *
 * Las fechas son `string` y no `Date`: el servicio las declara `Date`, pero JSON no tiene
 * fechas y lo que llega es una cadena ISO. Escribirlo como `Date` haria que `toLocaleDate`
 * fallara solo en tiempo de ejecucion.
 */

/** Lo que trae un objeto para cualquiera que pueda verlo. */
export interface ItemBase {
  id: string;
  name: string;
  description: string;
  condition: ItemCondition;
  category: string;
  status: ItemStatus;
  /** Lote que lo contiene, o null si esta libre. */
  lotId: string | null;
  /** Ronda que lo tiene comprometido, o null si no esta en subasta. */
  roundId: string | null;
  registeredAt: string;
}

/**
 * Rastro administrativo. Identifica al funcionario que toco el objeto y lleva la version
 * del bloqueo optimista, asi que el servicio no se lo manda a los estudiantes.
 */
export interface ItemAdminTrail {
  /** Hay que devolverla en el PATCH y en el DELETE para detectar ediciones cruzadas. */
  version: number;
  registeredBy: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

/**
 * El objeto tal como lo devuelven las escrituras (`POST /items`, `PATCH /items/:id`): sus
 * datos y su rastro administrativo, sin nada derivado de la multimedia.
 */
export type ItemRecord = ItemBase & ItemAdminTrail;

/**
 * Fila del listado (`GET /items`): el objeto mas su portada.
 *
 * El listado sigue sin traer la galeria. Lleva una sola fotografia, la primera, porque una
 * rejilla de objetos perdidos existe para reconocerlos de un vistazo, y eso no se hace con
 * texto. Inspeccionarlos es la ficha.
 */
export interface ItemSummary extends ItemRecord {
  /**
   * Enlace firmado de la primera fotografia, o `null` si el objeto no tiene ninguna.
   *
   * Caduca a los quince minutos, igual que los de la ficha: no sirve guardarlo en estado
   * propio, y por eso la consulta del catalogo tampoco lo cachea mas alla de esa ventana.
   */
  coverUrl: string | null;
}

/** Ficha del objeto (`GET /items/:id`) tal como la ve un estudiante (HU-08). */
export interface ItemFicha extends ItemBase {
  /** Ya ordenadas por `position`. Arreglo vacio si el objeto no tiene ninguna. */
  photos: MediaAsset[];
  /** A lo sumo uno. El campo nunca falta: una ficha sin video se pinta igual. */
  video: MediaAsset | null;
}

/** La misma ficha, con el rastro administrativo, tal como la ve un funcionario. */
export type ItemDetail = ItemFicha & ItemAdminTrail;

/**
 * Lo que responde `GET /items/:id`: depende de quien pregunta. El componente no elige, lo
 * elige el servicio, y por eso hay que estrechar el tipo antes de leer la version.
 */
export type ItemView = ItemFicha | ItemDetail;

export function isItemDetail(item: ItemView): item is ItemDetail {
  return 'version' in item;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/** Filtros de `GET /items`. Sin `limit` el servicio aplica `DEFAULT_PAGE_SIZE`. */
export interface ListItemsQuery {
  status?: ItemStatus;
  /** Categoria exacta, no busqueda parcial. */
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * Longitudes que aplica el servicio. Duplicarlas aqui permite que el propio control corte
 * antes de escribir de mas, en vez de gastar una peticion para que la rechacen.
 */
export const ITEM_LIMITS = {
  name: 120,
  description: 2000,
  category: 60,
} as const;

/** Cuerpo de `POST /items`. Operacion de funcionario. */
export interface CreateItemRequest {
  name: string;
  description: string;
  condition: ItemCondition;
  category: string;
}

/**
 * Cuerpo de `PATCH /items/:id`. Operacion de funcionario.
 *
 * `version` es obligatoria aunque el resto sea opcional: es la que leyo el formulario, y
 * con ella el servicio responde 409 si alguien mas edito el objeto entre medias.
 */
export interface UpdateItemRequest {
  version: number;
  name?: string;
  description?: string;
  condition?: ItemCondition;
  category?: string;
  status?: ItemStatus;
}

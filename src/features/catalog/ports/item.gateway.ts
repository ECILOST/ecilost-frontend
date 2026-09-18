import type {
  CreateItemRequest,
  ItemSummary,
  ItemView,
  ListItemsQuery,
  UpdateItemRequest,
} from '../model/item';

/**
 * Lo que la aplicacion necesita del catalogo de objetos, sin decir por donde llega.
 *
 * Las pantallas dependen de esta interfaz y no del cliente HTTP: en las pruebas se monta un
 * doble (`test/helpers/fake-gateways.ts`) y no hace falta simular la red.
 */
export interface ItemGateway {
  /** `GET /items`. Cualquier sesion valida puede listar. */
  list(query?: ListItemsQuery): Promise<ItemSummary[]>;

  /**
   * `GET /items/:id`. Devuelve la ficha completa a un funcionario y la recortada a un
   * estudiante; el rol lo decide el servicio a partir del token.
   */
  findById(id: string): Promise<ItemView>;

  /** `POST /items`. Operacion de funcionario. */
  create(request: CreateItemRequest): Promise<ItemSummary>;

  /** `PATCH /items/:id`. Operacion de funcionario, con bloqueo optimista por version. */
  update(id: string, request: UpdateItemRequest): Promise<ItemSummary>;

  /** `DELETE /items/:id`. La version viaja como parametro de consulta. */
  remove(id: string, version: number): Promise<void>;
}

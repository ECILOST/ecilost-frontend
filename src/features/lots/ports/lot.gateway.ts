import type { CreateLotRequest, Lot } from '../model/lot';

/**
 * Lo que la aplicacion necesita de los lotes, sin decir por donde llega.
 *
 * No hay `PATCH` ni `DELETE` de lotes porque el servicio no los publica: declarar aqui un
 * `update` que nadie puede implementar seria prometer algo que la pantalla acabaria
 * ofreciendo. Las fotografias tampoco: el lote muestra las de sus objetos.
 */
export interface LotGateway {
  /** `GET /lots`. Cualquier sesion valida puede consultarlos. */
  /** `GET /lots`; con `ids`, solo esos lotes. */
  list(ids?: string[]): Promise<Lot[]>;

  /** `GET /lots/:id`. Trae el lote con sus objetos, en id y nombre. */
  findById(id: string): Promise<Lot>;

  /**
   * `POST /lots`. Operacion de funcionario.
   *
   * Es atomica: si al llegar alguno de los objetos ya no esta disponible, el servicio
   * responde 409 y **no crea el lote**, asi que no hay estados a medias que compensar.
   */
  create(request: CreateLotRequest): Promise<Lot>;
}

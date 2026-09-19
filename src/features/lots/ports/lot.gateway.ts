import type { CreateLotRequest, Lot } from '../model/lot';

/**
 * Lo que la aplicacion necesita de los lotes, sin decir por donde llega.
 *
 * Son tres operaciones y no cinco porque el servicio publica tres: no hay `PATCH` ni
 * `DELETE` de lotes. Declarar aqui un `update` que nadie puede implementar seria prometer
 * algo que la pantalla acabaria ofreciendo.
 */
export interface LotGateway {
  /** `GET /lots`. Cualquier sesion valida puede consultarlos. */
  list(): Promise<Lot[]>;

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

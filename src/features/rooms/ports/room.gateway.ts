import type {
  RoomDetail,
  RoomSummary,
  ScheduleRoomRequest,
} from '../model/room';

/**
 * Lo que el funcionario necesita para programar y revisar salas, sin decir por donde llega.
 *
 * Es un puerto aparte de `AuctionGateway` a proposito: ese sirve a quien puja y hoy lo
 * cumple el adaptador de demostracion; este habla ya con ecilost-auction-service.
 */
export interface RoomGateway {
  /** `GET /rooms`. De la mas proxima a la mas lejana. */
  list(): Promise<RoomSummary[]>;

  /** `GET /rooms/:id`. La sala con sus rondas. */
  findById(id: string): Promise<RoomDetail>;

  /**
   * `POST /rooms`. Operacion de funcionario.
   *
   * Antes de crear la sala el servicio reserva cada objeto o lote en catalog: si alguno ya
   * no esta disponible responde 409 y no crea nada. Si catalog no contesta, 503.
   */
  schedule(request: ScheduleRoomRequest): Promise<RoomDetail>;
}

import type {
  RoomDetail,
  RoomSummary,
  ScheduleRoomRequest,
  SpinResult,
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

  /**
   * Subastas dinamicas: `PATCH /rooms/:id/dynamic-modes`. Solo el dueño de la sala (quien la
   * programo); a otro funcionario el servicio le responde 403.
   */
  setDynamicModes(roomId: string, enabled: boolean): Promise<void>;

  /**
   * Subastas dinamicas: `POST /rooms/:id/rounds/:roundId/spin`. El resultado lo decide el
   * servidor; la pantalla solo lo anima.
   */
  spin(roomId: string, roundId: string): Promise<SpinResult>;
}

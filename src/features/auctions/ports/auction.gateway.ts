import type {
  AppNotification,
  AuctionItem,
  LiveRoom,
  MyBid,
  Room,
  RoomSummary,
} from '../model/auction';

/**
 * Lo que las pantallas de subasta necesitan, sin decir por donde llega.
 *
 * Hoy lo cumple `createDemoAuctionGateway` (en memoria). El adaptador real repartira las
 * operaciones entre ecilost-auction-service (salas, admision, pujas, estado) y
 * ecilost-engagement-service (canal `/realtime` y notificaciones), sin tocar pantallas.
 */
export interface AuctionGateway {
  /** Objetos de todas las salas, para el catalogo y la portada. */
  items(): Promise<AuctionItem[]>;
  item(id: string): Promise<AuctionItem>;

  room(id: string): Promise<Room>;
  /** `POST /rooms/:id/participants`. Solo antes de que la sala empiece. */
  joinRoom(id: string): Promise<Room>;

  /** `GET /rooms/:id/state`: lo que hay que pintar al entrar o al reconectar. */
  liveRoom(id: string): Promise<LiveRoom>;
  /** `POST /rounds/:id/bids` sobre la ronda activa de la sala. */
  placeBid(roomId: string, amount: number): Promise<LiveRoom>;
  buyNow(roomId: string): Promise<LiveRoom>;
  setAutoBid(
    roomId: string,
    config: { enabled: boolean; limit: number },
  ): Promise<LiveRoom>;
  /**
   * Cambios en vivo de la sala (precio, contador, transicion de ronda). Devuelve la funcion
   * para dejar de escuchar. Es el equivalente del canal de Socket.IO de engagement.
   */
  subscribe(roomId: string, listener: (state: LiveRoom) => void): () => void;

  roomSummary(id: string): Promise<RoomSummary>;
  myBids(): Promise<MyBid[]>;
  notifications(): Promise<AppNotification[]>;
  markNotificationsRead(): Promise<void>;
}

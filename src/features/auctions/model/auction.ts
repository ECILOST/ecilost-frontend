/**
 * Contratos de las subastas tal como los consume la interfaz.
 *
 * Todavia no calcan un DTO: ecilost-auction-service publica salas, rondas y pujas, y
 * ecilost-engagement-service el canal en vivo y las notificaciones, pero la conexion del
 * front con ambos esta pendiente. Mientras tanto los sirve el adaptador de demostracion
 * (`api/demo-auction.gateway.ts`) y estos tipos son el acuerdo entre pantallas y adaptador.
 *
 * Los importes van como `number` porque el adaptador de demostracion no tiene decimales;
 * cuando llegue el adaptador HTTP se revisara si conviene cadena, como en la billetera.
 */

export type RoomStatus = 'SCHEDULED' | 'ACTIVE' | 'CLOSED';
export type RoundStatus = 'SCHEDULED' | 'ACTIVE' | 'CLOSED';

/** Como se ve un objeto desde el catalogo de subastas. */
export type AuctionItemStatus = 'LIVE' | 'UPCOMING' | 'CLOSED';

export interface AuctionItem {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  imageUrl: string | null;
  roomId: string;
  roomName: string;
  /** Posicion del objeto dentro de la sala (1..n) y cuantos tiene la sala. */
  position: number;
  roomSize: number;
  status: AuctionItemStatus;
  currentPrice: number;
  nextBid: number;
  buyNowPrice: number | null;
  /** Cuando empieza la sala a la que pertenece. */
  startsAt: string;
  /** Solo si esta en subasta: cuando termina su ronda. */
  endsAt: string | null;
  roundStartedAt: string | null;
  awarded: boolean;
}

export interface Round {
  id: string;
  position: number;
  itemId: string;
  itemName: string;
  status: RoundStatus;
  basePrice: number;
  currentPrice: number;
  currentBidderId: string | null;
  startedAt: string | null;
  endsAt: string | null;
  maximumEndsAt: string | null;
  buyNowPrice: number | null;
  /** Cierto si quien mira lleva la puja mas alta. */
  leading: boolean;
  /** La puja mas alta de quien mira en esta ronda, si pujo. */
  myHighestBid: number | null;
  /** Solo cerrada: si la gano quien mira. */
  wonByMe: boolean;
}

export interface Room {
  id: string;
  name: string;
  title: string;
  status: RoomStatus;
  startsAt: string;
  capacity: number;
  admitted: number;
  /** Cierto si quien mira fue admitido antes del inicio y por tanto puede pujar. */
  isParticipant: boolean;
  rounds: Round[];
}

export interface Bid {
  id: string;
  alias: string;
  amount: number;
  at: string;
  mine: boolean;
}

export type RoomActivityKind = 'BID' | 'OUTBID' | 'AWARDED' | 'STARTED';

export interface RoomActivity {
  id: string;
  kind: RoomActivityKind;
  text: string;
  at: string;
}

export interface AutoBid {
  enabled: boolean;
  limit: number;
  /** Se detuvo porque la siguiente puja pasaba del limite. */
  stopped: boolean;
}

/** Todo lo que pinta la sala en vivo. Es lo que empuja el canal en tiempo real. */
export interface LiveRoom {
  room: Room;
  /** La ronda activa, o `null` entre rondas o con la sala cerrada. */
  round: Round | null;
  bids: Bid[];
  activity: RoomActivity[];
  autoBid: AutoBid;
  participants: number;
  /** Hora del servidor: el contador se calcula contra ella, no contra el reloj local. */
  serverTime: string;
}

export type MyBidStatus = 'WINNING' | 'OUTBID' | 'WON' | 'LOST';

export interface MyBid {
  id: string;
  itemId: string;
  itemName: string;
  roomId: string;
  detail: string;
  amount: number;
  status: MyBidStatus;
  /** Cuanto se pujo por encima de quien mira, si lo superaron. */
  outbidBy: number | null;
  autoBidLimit: number | null;
}

export type NotificationKind =
  'OUTBID' | 'ROOM_SOON' | 'FOLLOW_ONLY' | 'WON' | 'LIMIT' | 'ROOM_CLOSED';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  roomId: string | null;
}

export type RoomOutcome = 'WON' | 'LOST' | 'NO_BID';

export interface RoomSummary {
  roomId: string;
  roomName: string;
  items: number;
  participants: number;
  closedAt: string;
  rows: Array<{
    itemId: string;
    itemName: string;
    position: number;
    outcome: RoomOutcome;
    amount: number | null;
    detail: string;
  }>;
  totalSpent: number;
}

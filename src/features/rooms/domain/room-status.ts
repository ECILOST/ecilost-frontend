/**
 * Estados de una sala y de sus rondas, copiados de los enums de ecilost-auction-service,
 * mas la traduccion con la que se muestran.
 *
 * El funcionario no mueve ninguno: la sala pasa sola de SCHEDULED a ACTIVE cuando llega su
 * hora, y a CLOSED cuando cierra su ultima ronda (HU-18). CANCELLED esta declarado en el
 * servicio pero ningun endpoint lo produce todavia.
 */
export const RoomStatus = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  SCHEDULED: 'Programada',
  ACTIVE: 'En curso',
  CLOSED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

/** Mismo reparto que objetos y lotes: lo que esta pasando se grita, lo terminado se apaga. */
export const ROOM_STATUS_TONE: Record<
  RoomStatus,
  'ok' | 'info' | 'live' | 'warn' | 'muted'
> = {
  SCHEDULED: 'info',
  ACTIVE: 'live',
  CLOSED: 'muted',
  CANCELLED: 'warn',
};

export const RoundStatus = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const;

export type RoundStatus = (typeof RoundStatus)[keyof typeof RoundStatus];

export const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  SCHEDULED: 'Pendiente',
  ACTIVE: 'En subasta',
  CLOSED: 'Cerrada',
};

/** Lo que puede ir en una ronda: un objeto suelto o un lote entero. */
export const AuctionableKind = {
  ITEM: 'ITEM',
  LOT: 'LOT',
} as const;

export type AuctionableKind =
  (typeof AuctionableKind)[keyof typeof AuctionableKind];

export const AUCTIONABLE_KIND_LABELS: Record<AuctionableKind, string> = {
  ITEM: 'Objeto',
  LOT: 'Lote',
};

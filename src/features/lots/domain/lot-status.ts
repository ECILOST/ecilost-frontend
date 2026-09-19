/**
 * Estados de un lote, copiados del enum de ecilost-catalog-service, mas la traduccion con la
 * que se muestran.
 *
 * Hoy el servicio solo produce `ACTIVE`: es el valor por defecto del esquema y ningun
 * endpoint mueve el estado. Los otros cuatro estan declarados en la base para lo que viene
 * (la sala de subastas cerrara y cancelara lotes con `releaseItems`), y se traducen aqui
 * para que el dia que aparezcan no se pinten en crudo.
 */
export const LotStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  IN_ROUND: 'IN_ROUND',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type LotStatus = (typeof LotStatus)[keyof typeof LotStatus];

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  IN_ROUND: 'En subasta',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

/**
 * Tono visual del distintivo, con el mismo reparto que los estados de un objeto: `live` es
 * lo que esta pasando ahora y por eso se grita, y lo terminado se apaga.
 */
export const LOT_STATUS_TONE: Record<
  LotStatus,
  'ok' | 'info' | 'live' | 'warn' | 'muted'
> = {
  DRAFT: 'info',
  ACTIVE: 'ok',
  IN_ROUND: 'live',
  CLOSED: 'muted',
  CANCELLED: 'warn',
};

/**
 * Estados de un objeto del catalogo, copiados del enum de ecilost-catalog-service, mas la
 * traduccion con la que se muestran.
 *
 * El texto en pantalla vive aqui y no dentro de cada componente: repartido, el mismo estado
 * acabaria llamandose distinto en la lista y en la ficha.
 */
export const ItemStatus = {
  AVAILABLE: 'AVAILABLE',
  IN_LOT: 'IN_LOT',
  IN_ROUND: 'IN_ROUND',
  SOLD: 'SOLD',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  AVAILABLE: 'Disponible',
  IN_LOT: 'En lote',
  IN_ROUND: 'En subasta',
  SOLD: 'Vendido',
  WITHDRAWN: 'Retirado',
};

/** Tono visual de la insignia. Lo consume `ItemStatusBadge`. */
export const ITEM_STATUS_TONE: Record<
  ItemStatus,
  'ok' | 'info' | 'warn' | 'muted'
> = {
  AVAILABLE: 'ok',
  IN_LOT: 'info',
  IN_ROUND: 'info',
  SOLD: 'muted',
  WITHDRAWN: 'warn',
};

/**
 * Un objeto comprometido por un lote o una ronda no se puede editar ni borrar: el servicio
 * responde 409. Saberlo aqui evita ofrecer un boton que solo sirve para recibir un error.
 */
export function isCommitted(status: ItemStatus): boolean {
  return status === ItemStatus.IN_LOT || status === ItemStatus.IN_ROUND;
}

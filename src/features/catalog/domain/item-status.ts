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

/**
 * Tono visual de la insignia. Lo consume `ItemStatusBadge`, que es quien lo traduce a color.
 *
 * `live` existe aparte de `info` porque un objeto que esta ahora mismo en una ronda es lo
 * que la interfaz debe gritar: es el equivalente del distintivo "en vivo".
 */
export const ITEM_STATUS_TONE: Record<
  ItemStatus,
  'ok' | 'info' | 'live' | 'warn' | 'muted'
> = {
  AVAILABLE: 'ok',
  IN_LOT: 'info',
  IN_ROUND: 'live',
  SOLD: 'muted',
  WITHDRAWN: 'warn',
};

/**
 * Un objeto comprometido esta reservado por un lote o por una ronda.
 *
 * Editar sus datos si se puede: el servicio solo mira el estado cuando la edicion incluye un
 * cambio de estado. Lo que no se puede es borrarlo.
 */
export function isCommitted(status: ItemStatus): boolean {
  return status === ItemStatus.IN_LOT || status === ItemStatus.IN_ROUND;
}

/**
 * Transiciones que un funcionario puede hacer a mano, copiadas de la tabla del servicio:
 * retirar lo disponible y reponer lo retirado, y nada mas. Entrar a un lote, entrar a una
 * ronda y venderse los mueve el sistema, y pedirlos desde aqui responde 409.
 */
export function manualTransition(status: ItemStatus): ItemStatus | null {
  if (status === ItemStatus.AVAILABLE) return ItemStatus.WITHDRAWN;
  if (status === ItemStatus.WITHDRAWN) return ItemStatus.AVAILABLE;
  return null;
}

/**
 * Por que no se puede borrar, o `null` si si se puede.
 *
 * Saberlo de este lado evita ofrecer un boton cuyo unico resultado posible es un 409. La
 * decision sigue siendo del servicio, que la toma dentro de la propia sentencia de borrado;
 * esto solo evita el viaje.
 */
export function deletionBlockedReason(status: ItemStatus): string | null {
  if (status === ItemStatus.SOLD) {
    return 'Ya se vendió, y su historial debe conservarse.';
  }
  if (isCommitted(status)) {
    return status === ItemStatus.IN_LOT
      ? 'Pertenece a un lote.'
      : 'Está comprometido en una ronda de subasta.';
  }
  return null;
}

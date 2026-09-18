/** Estado fisico del objeto, copiado del enum de ecilost-catalog-service. */
export const ItemCondition = {
  NEW: 'NEW',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  DAMAGED: 'DAMAGED',
} as const;

export type ItemCondition = (typeof ItemCondition)[keyof typeof ItemCondition];

export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: 'Nuevo',
  GOOD: 'Bueno',
  FAIR: 'Aceptable',
  DAMAGED: 'Dañado',
};

import { describe, expect, it } from 'vitest';
import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_TONE,
  ItemStatus,
  isCommitted,
} from './item-status';

describe('ItemStatus', () => {
  // El dia que el catalogo agregue un estado, esta prueba falla antes de que la interfaz
  // muestre la constante cruda en pantalla.
  it('tiene traduccion y tono para todos los estados', () => {
    for (const status of Object.values(ItemStatus)) {
      expect(ITEM_STATUS_LABELS[status]).toBeTruthy();
      expect(ITEM_STATUS_TONE[status]).toBeTruthy();
    }
  });

  it('considera comprometidos los objetos que estan en un lote o en una ronda', () => {
    expect(isCommitted(ItemStatus.IN_LOT)).toBe(true);
    expect(isCommitted(ItemStatus.IN_ROUND)).toBe(true);
    expect(isCommitted(ItemStatus.AVAILABLE)).toBe(false);
  });
});

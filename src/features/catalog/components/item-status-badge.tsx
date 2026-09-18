import { Pill, type PillTone } from '@/shared/components/ui/pill';
import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_TONE,
  type ItemStatus,
} from '../domain/item-status';

/**
 * El dominio decide el tono ('ok', 'info', ...) y aqui se traduce al color del sistema. Asi
 * `item-status.ts` no depende de la paleta, y cambiar el color de "disponible" es una linea.
 */
const TONE_TO_PILL: Record<(typeof ITEM_STATUS_TONE)[ItemStatus], PillTone> = {
  ok: 'mint',
  info: 'blue',
  warn: 'amber',
  muted: 'neutral',
};

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <Pill tone={TONE_TO_PILL[ITEM_STATUS_TONE[status]]} dot>
      {ITEM_STATUS_LABELS[status]}
    </Pill>
  );
}

import { Pill, type PillTone } from '@/shared/components/ui/pill';
import {
  LOT_STATUS_LABELS,
  LOT_STATUS_TONE,
  type LotStatus,
} from '../domain/lot-status';

/**
 * El dominio decide el tono y aqui se traduce al color del sistema, igual que con los
 * objetos: asi `lot-status.ts` no depende de la paleta.
 */
const TONE_TO_PILL: Record<(typeof LOT_STATUS_TONE)[LotStatus], PillTone> = {
  ok: 'green',
  info: 'blue',
  live: 'pink',
  warn: 'yellow',
  muted: 'neutral',
};

export function LotStatusBadge({
  status,
  solid,
}: {
  status: LotStatus;
  solid?: boolean;
}) {
  return (
    <Pill tone={TONE_TO_PILL[LOT_STATUS_TONE[status]]} solid={solid} dot>
      {LOT_STATUS_LABELS[status]}
    </Pill>
  );
}

import { Pill, type PillTone } from '@/shared/components/ui/pill';
import {
  ROOM_STATUS_LABELS,
  ROOM_STATUS_TONE,
  type RoomStatus,
} from '../domain/room-status';

/** Mismo reparto de tonos que objetos y lotes, traducido aqui a la paleta del sistema. */
const TONE_TO_PILL: Record<(typeof ROOM_STATUS_TONE)[RoomStatus], PillTone> = {
  ok: 'green',
  info: 'blue',
  live: 'pink',
  warn: 'yellow',
  muted: 'neutral',
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return (
    <Pill tone={TONE_TO_PILL[ROOM_STATUS_TONE[status]]} dot>
      {ROOM_STATUS_LABELS[status]}
    </Pill>
  );
}

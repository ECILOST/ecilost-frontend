import { MODE_META } from '@/features/auctions/domain/dynamic-modes';
import type { RoundMode } from '@/features/auctions/model/auction';
import type { PillTone } from '@/shared/components/ui/pill';

/**
 * Nombre y color de cada modalidad, la clasica incluida. Las dinamicas toman los de
 * `MODE_META` para que el perfil pinte cada modalidad igual que la ruleta y la sala.
 */
export function modeLook(mode: RoundMode): {
  label: string;
  color: string;
  tone: PillTone;
} {
  if (mode === 'CLASSIC')
    return { label: 'Clásica', color: 'var(--eci-cyan)', tone: 'cyan' };
  const meta = MODE_META[mode];
  return { label: meta.label, color: meta.color, tone: meta.tone };
}

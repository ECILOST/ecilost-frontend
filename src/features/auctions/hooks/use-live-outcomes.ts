import { useEffect, useRef, useState } from 'react';
import { EXTENSION_NOTICE_MS, LAST_SECONDS_MS } from '../domain/auction-rules';
import {
  detectLiveRoomChange,
  type Outcome,
} from '../domain/live-room-changes';
import type { LiveRoom } from '../model/auction';

/**
 * Los avisos de la sala en vivo: el que toca mostrar y si el cierre acaba de extenderse.
 *
 * Compara cada estado con el anterior (`detectLiveRoomChange`) y suma lo que depende del
 * reloj: "ultimos segundos" una vez por ronda, y el aviso de extension que se apaga solo.
 * La pantalla puede fijar o cerrar el aviso con `setOutcome` (al pujar, al cerrar el dialogo).
 */
export function useLiveOutcomes(live: LiveRoom | undefined, remaining: number) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  /** Cierre extendido por anti-sniping: se avisa un momento, el contador ya lo refleja. */
  const [extended, setExtended] = useState(false);
  const previous = useRef<LiveRoom | undefined>(undefined);
  const lastSecondsShown = useRef<string | null>(null);
  const outbidShown = useRef<string | null>(null);
  const round = live?.round ?? null;

  useEffect(() => {
    const before = previous.current;
    previous.current = live;
    if (!live || !before) return;

    const change = detectLiveRoomChange(before, live, outbidShown.current);
    if (change.extended) setExtended(true);
    if (!change.outcome) return;
    if (change.outcome.kind === 'outbid')
      outbidShown.current = change.outcome.round.id;
    setOutcome(change.outcome);
  }, [live]);

  useEffect(() => {
    if (!extended) return;
    const timer = setTimeout(() => setExtended(false), EXTENSION_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [extended, round?.endsAt]);

  useEffect(() => {
    if (!round || remaining <= 0 || remaining > LAST_SECONDS_MS) return;
    if (lastSecondsShown.current === round.id) return;
    lastSecondsShown.current = round.id;
    setOutcome({ kind: 'last', round });
  }, [remaining, round]);

  return { outcome, setOutcome, extended };
}

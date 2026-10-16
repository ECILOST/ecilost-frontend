import { useCallback, useEffect, useRef, useState } from 'react';
import { serverNow } from '@/shared/api/server-clock';
import { detectRouletteSpin, shouldAnnounce, type RouletteSpin } from '../domain/dynamic-modes';
import type { LiveRoom } from '../model/auction';

/**
 * Subastas dinamicas en la sala en vivo: cuando el dueño gira la ruleta (para animarla) y
 * cuando empieza una ronda dinamica (para anunciarla a pantalla completa, una vez por ronda).
 */
export function useDynamicRoom(live: LiveRoom | undefined) {
  const [spin, setSpin] = useState<RouletteSpin | null>(null);
  const [announced, setAnnounced] = useState<string | null>(null);
  const [announcing, setAnnouncing] = useState<string | null>(null);
  const previous = useRef<LiveRoom | undefined>(undefined);

  useEffect(() => {
    const before = previous.current;
    previous.current = live;
    if (!live || !before) return;
    const detected = detectRouletteSpin(before.room.rounds, live.room.rounds);
    if (detected) setSpin(detected);
  }, [live]);

  const round = live?.round ?? null;
  useEffect(() => {
    if (!round || round.id === announced) return;
    setAnnounced(round.id);
    if (shouldAnnounce(round, serverNow())) setAnnouncing(round.id);
  }, [round, announced]);

  const closeSpin = useCallback(() => setSpin(null), []);
  const closeAnnouncement = useCallback(() => setAnnouncing(null), []);

  return {
    spin,
    closeSpin,
    announcing: round && announcing === round.id ? round : null,
    closeAnnouncement,
  };
}

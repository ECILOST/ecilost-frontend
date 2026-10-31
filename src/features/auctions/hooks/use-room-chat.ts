import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useContainer } from '@/app/providers/container-provider';
import { CHAT_CONNECTING } from '../domain/room-chat';
import type { RoomChat } from '../model/auction';

/**
 * Chat de la sala en curso. No pasa por la cache de consultas: no hay nada que consultar,
 * solo un canal que empuja el chat entero en cada cambio (y el historial al reconectar).
 */
export function useRoomChat(roomId: string, enabled = true) {
  const { auctions } = useContainer();
  const [chat, setChat] = useState<RoomChat>(CHAT_CONNECTING);

  useEffect(() => {
    if (!enabled) return;
    setChat(CHAT_CONNECTING);
    return auctions.subscribeChat(roomId, setChat);
  }, [auctions, roomId, enabled]);

  const send = useMutation({
    mutationFn: (text: string) => auctions.sendChatMessage(roomId, text),
  });

  return { chat, send };
}

import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { RoomDetail, RoomSummary } from '../model/room';

/** Claves de cache de salas. Centralizadas por lo mismo que las del catalogo. */
export const roomKeys = {
  all: ['rooms'] as const,
  lists: () => [...roomKeys.all, 'list'] as const,
  detail: (id: string) => [...roomKeys.all, 'detail', id] as const,
};

/** Caso de uso "ver las salas programadas" (HU-15). */
export function useRooms() {
  const { rooms } = useContainer();

  return useQuery<RoomSummary[]>({
    queryKey: roomKeys.lists(),
    queryFn: () => rooms.list(),
  });
}

/** Caso de uso "ver una sala con sus rondas" (HU-15). */
export function useRoomDetail(id: string) {
  const { rooms } = useContainer();

  return useQuery<RoomDetail>({
    queryKey: roomKeys.detail(id),
    queryFn: () => rooms.findById(id),
    enabled: id !== '',
  });
}

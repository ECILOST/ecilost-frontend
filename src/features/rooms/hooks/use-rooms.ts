import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/**
 * Subastas dinamicas: el dueño activa o desactiva la ruleta de su sala. Al terminar se relee
 * la sala: desactivarla devuelve a clasica las rondas que aun no empezaron.
 */
export function useSetDynamicModes(roomId: string) {
  const { rooms } = useContainer();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => rooms.setDynamicModes(roomId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.detail(roomId) }),
  });
}

/** Subastas dinamicas: el dueño gira la ruleta de una ronda que aun no empezo. */
export function useSpinRoulette(roomId: string) {
  const { rooms } = useContainer();
  return useMutation({
    mutationFn: (roundId: string) => rooms.spin(roomId, roundId),
  });
}

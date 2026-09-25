import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { itemKeys } from '@/features/catalog/hooks/use-items';
import { lotKeys } from '@/features/lots/hooks/use-lots';
import type { RoomDetail, ScheduleRoomRequest } from '../model/room';
import { roomKeys } from './use-rooms';

/**
 * Caso de uso "programar una sala" (HU-15).
 *
 * Programar reserva en catalog los objetos y lotes de cada ronda, que pasan a "En subasta".
 * Por eso se invalida tambien el catalogo y los lotes, y no solo las salas: una lista en
 * cache los seguiria ofreciendo como disponibles. Se invalida igual si falla, porque un 409
 * significa justo que la lista que se estaba viendo ya no era cierta.
 */
export function useScheduleRoom() {
  const { rooms } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<RoomDetail, Error, ScheduleRoomRequest>({
    mutationFn: (request: ScheduleRoomRequest) => rooms.schedule(request),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: itemKeys.all });
      await queryClient.invalidateQueries({ queryKey: lotKeys.all });
    },
  });
}

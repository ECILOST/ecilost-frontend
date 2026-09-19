import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { itemKeys } from '@/features/catalog/hooks/use-items';
import type { CreateLotRequest, Lot } from '../model/lot';
import { lotKeys } from './use-lots';

/**
 * Caso de uso "agrupar objetos en un lote" (HU-05).
 *
 * Al terminar se invalida tambien **todo el catalogo**, y no solo los lotes: los objetos
 * agrupados pasaron a `IN_LOT` y se les incremento la version. Un listado o una ficha que
 * siguieran en cache los enseñarian disponibles, y peor aun, con una version vieja que
 * haria fallar la siguiente edicion sin motivo aparente.
 */
export function useCreateLot() {
  const { lots } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<Lot, Error, CreateLotRequest>({
    mutationFn: (request: CreateLotRequest) => lots.create(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lotKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

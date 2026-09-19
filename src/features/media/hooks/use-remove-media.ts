import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { itemKeys } from '@/features/catalog/hooks/use-items';

/**
 * Caso de uso "quitar una pieza multimedia" (HU-07, criterio 3).
 *
 * Solo afecta a la pieza nombrada; el resto de la ficha queda intacta. Al terminar se
 * invalida la ficha entera y no se quita la pieza de la cache a mano, porque al retirar una
 * fotografia el servicio no renumera las demas: lo que hay que releer es como quedo la
 * galeria, no solo cual falta.
 */
export function useRemoveMedia(itemId: string) {
  const { media } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (mediaId: string) => media.remove(itemId, mediaId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(itemId) }),
  });
}

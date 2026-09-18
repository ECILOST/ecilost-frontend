import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { itemKeys } from '@/features/catalog/hooks/use-items';
import type { MediaAsset } from '../model/media';

/**
 * Caso de uso "adjuntar multimedia a un objeto" (HU-07). Plantilla de las escrituras.
 *
 * Al terminar invalida la ficha en vez de insertar la pieza en la cache a mano: la pieza
 * nueva necesita una URL firmada que solo emite el servicio, asi que lo unico correcto es
 * volver a leer.
 */
export function useUploadMedia(itemId: string) {
  const { media } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<MediaAsset, Error, File>({
    mutationFn: (file: File) => media.upload(itemId, file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(itemId) }),
  });
}

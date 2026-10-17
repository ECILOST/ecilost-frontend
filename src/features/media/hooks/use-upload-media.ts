import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useContainer } from '@/app/providers/container-provider';
import { itemKeys } from '@/features/catalog/hooks/use-items';
import { useSequentialUpload } from './use-sequential-upload';

export type {
  RejectedFile,
  UploadProgress,
  UploadReport,
} from './use-sequential-upload';

/**
 * Caso de uso "adjuntar multimedia a un objeto" (HU-07).
 *
 * El endpoint acepta **un archivo por peticion**: la tanda la lleva `useSequentialUpload`,
 * que comparte con las fotografias de los lotes. Al terminar invalida la ficha en vez de
 * insertar las piezas en la cache a mano: cada una necesita una URL firmada que solo emite el
 * servicio, asi que lo unico correcto es volver a leer.
 */
export function useUploadMedia(itemId: string) {
  const { media } = useContainer();
  const queryClient = useQueryClient();

  return useSequentialUpload({
    owner: 'objeto',
    send: useCallback(
      (file: File) => media.upload(itemId, file),
      [media, itemId],
    ),
    onUploaded: useCallback(
      () =>
        queryClient.invalidateQueries({ queryKey: itemKeys.detail(itemId) }),
      [queryClient, itemId],
    ),
  });
}

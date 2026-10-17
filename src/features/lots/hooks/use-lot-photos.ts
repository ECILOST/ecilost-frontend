import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useContainer } from '@/app/providers/container-provider';
import { useSequentialUpload } from '@/features/media/hooks/use-sequential-upload';
import { lotKeys } from './use-lots';

/**
 * Caso de uso "adjuntar fotografias a un lote". La tanda (un archivo por peticion, encadenados)
 * es la misma que la de los objetos. Al terminar se relee el lote y el listado, porque las
 * dos pantallas muestran su portada firmada.
 */
export function useUploadLotPhotos(lotId: string) {
  const { lots } = useContainer();
  const queryClient = useQueryClient();

  return useSequentialUpload({
    owner: 'lote',
    send: useCallback(
      (file: File) => lots.uploadPhoto(lotId, file),
      [lots, lotId],
    ),
    onUploaded: useCallback(
      () => invalidateLot(queryClient, lotId),
      [queryClient, lotId],
    ),
  });
}

/** Caso de uso "quitar una fotografia del lote". Relee el lote en vez de tocar la cache. */
export function useRemoveLotPhoto(lotId: string) {
  const { lots } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (photoId: string) => lots.removePhoto(lotId, photoId),
    onSuccess: () => invalidateLot(queryClient, lotId),
  });
}

function invalidateLot(
  queryClient: ReturnType<typeof useQueryClient>,
  lotId: string,
): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: lotKeys.detail(lotId) }),
    queryClient.invalidateQueries({ queryKey: lotKeys.lists() }),
  ]);
}

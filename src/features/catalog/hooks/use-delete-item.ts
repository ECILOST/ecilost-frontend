import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import { itemKeys } from './use-items';

export interface DeleteItemInput {
  id: string;
  /** La que se leyo en la ficha. Viaja como parametro de consulta, no en el cuerpo. */
  version: number;
}

/**
 * Caso de uso "borrar un objeto del catalogo" (HU-04).
 *
 * El servicio rechaza el borrado de un objeto comprometido en un lote o en una ronda, y de
 * uno ya vendido, y en el 409 nombra cual de las tres cosas lo retiene. La interfaz ya no
 * ofrece el boton en esos casos, pero el error se sigue tratando: entre leer la ficha y
 * pulsar puede haber entrado a una ronda.
 *
 * Al terminar se quita la ficha de la cache en vez de invalidarla: invalidar la volveria a
 * pedir, y la respuesta seria un 404 sobre algo que se acaba de borrar a proposito.
 */
export function useDeleteItem() {
  const { items } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteItemInput>({
    mutationFn: ({ id, version }: DeleteItemInput) => items.remove(id, version),
    onSuccess: async (_result, { id }) => {
      queryClient.removeQueries({ queryKey: itemKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { CreateItemRequest, ItemRecord } from '../model/item';
import { itemKeys } from './use-items';

/**
 * Caso de uso "registrar un objeto perdido" (HU-03).
 *
 * Al terminar invalida las listas y no la ficha: el objeto acaba de nacer, asi que no hay
 * ficha suya en la cache que pueda estar vieja. Lo que si envejecio es cualquier listado ya
 * traido, que ahora le falta una fila.
 *
 * El alta no acepta ni estado ni fotografias, y no es una omision de esta capa: el servicio
 * rechaza cualquier campo que no sean los cuatro del formulario. El objeto nace disponible y
 * vacio, y la multimedia se adjunta despues contra el objeto ya creado.
 */
export function useCreateItem() {
  const { items } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<ItemRecord, Error, CreateItemRequest>({
    mutationFn: (request: CreateItemRequest) => items.create(request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() }),
  });
}

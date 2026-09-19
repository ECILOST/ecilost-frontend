import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { ItemRecord, UpdateItemRequest } from '../model/item';
import { itemKeys } from './use-items';

export interface UpdateItemInput {
  id: string;
  request: UpdateItemRequest;
}

/**
 * Caso de uso "editar un objeto registrado" (HU-04).
 *
 * `version` viaja dentro de `request` porque el servicio la exige: escribe solo si esa
 * version sigue siendo la vigente y responde 409 si no lo es. Sin ese numero, dos
 * funcionarios editando la misma ficha se pisarian en silencio y ganaria el segundo en
 * guardar.
 *
 * Al terminar se invalidan la ficha y las listas: la fila del catalogo tambien enseña el
 * nombre y el estado, asi que quedarse solo con la ficha dejaria el listado mintiendo.
 */
export function useUpdateItem() {
  const { items } = useContainer();
  const queryClient = useQueryClient();

  return useMutation<ItemRecord, Error, UpdateItemInput>({
    mutationFn: ({ id, request }: UpdateItemInput) => items.update(id, request),
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: itemKeys.detail(item.id) });
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

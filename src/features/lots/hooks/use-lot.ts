import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { Lot } from '../model/lot';
import { lotKeys } from './use-lots';

/**
 * Caso de uso "ver un lote" (HU-06).
 *
 * El lote no trae multimedia ni URL firmadas, asi que no caduca como la ficha de un objeto y
 * no necesita la ventana corta de vida que si lleva `useItem`.
 */
export function useLot(id: string) {
  const { lots } = useContainer();

  return useQuery<Lot>({
    queryKey: lotKeys.detail(id),
    queryFn: () => lots.findById(id),
    enabled: id !== '',
  });
}

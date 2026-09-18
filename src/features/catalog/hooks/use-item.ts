import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { ItemView } from '../model/item';
import { itemKeys } from './use-items';

/** Las URL firmadas de multimedia duran quince minutos; se releen bastante antes. */
const SIGNED_URL_SAFE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Caso de uso "ver la ficha de un objeto" (HU-08).
 *
 * La multimedia viaja dentro de la respuesta, no en una consulta aparte, asi que la ficha
 * envejece al ritmo de sus enlaces firmados: pasada la ventana, una ficha servida de cache
 * pintaria imagenes rotas.
 */
export function useItem(id: string) {
  const { items } = useContainer();

  return useQuery<ItemView>({
    queryKey: itemKeys.detail(id),
    queryFn: () => items.findById(id),
    staleTime: SIGNED_URL_SAFE_WINDOW_MS,
    gcTime: SIGNED_URL_SAFE_WINDOW_MS,
    enabled: id !== '',
  });
}

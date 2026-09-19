import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { UserLookup } from '../model/session';

/**
 * Caso de uso "encontrar a alguien por su correo" (operacion de funcionario).
 *
 * Existe porque los dos lados hablan idiomas distintos: un funcionario conoce a una persona
 * por su correo institucional, y wallet, auction-core y engagement solo guardan su `userId`.
 * Sin esta traduccion, cualquier operacion sobre la cuenta de otra persona se quedaria en
 * pedir un identificador que nadie tiene a mano.
 *
 * Es busqueda exacta y de un solo resultado: confirma a quien ya se conoce, no recorre el
 * directorio. Un correo sin cuenta responde 404, y eso no es un fallo que reintentar.
 */
export function useUserLookup(email: string) {
  const { auth } = useContainer();

  return useQuery<UserLookup>({
    queryKey: ['auth', 'users', email],
    queryFn: () => auth.findUserByEmail(email),
    // Cadena vacia = todavia no se ha buscado nada.
    enabled: email !== '',
    retry: false,
    // Un correo no cambia de dueño durante una sesion de trabajo.
    staleTime: 10 * 60 * 1000,
  });
}

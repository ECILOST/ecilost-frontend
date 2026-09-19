import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { Profile } from '../model/session';
import { useSession } from './use-session';

/**
 * Los datos de presentacion de quien esta dentro: nombre, avatar y codigo institucional.
 *
 * Son una consulta aparte de `GET /auth/me` porque el servicio los tiene separados a
 * proposito: `me` solo decodifica el token y es el ejemplo de verificacion local que copian
 * los demas servicios, mientras que esto lee la base. Los datos personales no viajan dentro
 * de una credencial que cruza cinco servicios.
 *
 * Que la cabecera no tenga el perfil no es un error que haya que enseñar: se cae a las
 * iniciales y al rol, que es lo que ya se sabia por el token.
 */
export function useProfile() {
  const { auth } = useContainer();
  const { status } = useSession();

  return useQuery<Profile>({
    queryKey: ['auth', 'profile'],
    queryFn: () => auth.profile(),
    // Sin sesion no hay a quien preguntarle, y preguntarlo igual seria un 401 seguro.
    enabled: status === 'authenticated',
    // El nombre y el avatar los reescribe Google en cada entrada, no durante la sesion.
    staleTime: Infinity,
    retry: false,
  });
}

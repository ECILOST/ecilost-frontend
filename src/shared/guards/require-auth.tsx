import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useSession } from '@/features/auth/hooks/use-session';
import { Loading } from '../components/loading';
import { Page } from '../components/ui/page';

/**
 * Contraparte de `JwtAuthGuard`: sin sesion no se entra.
 *
 * Es comodidad de navegacion, no seguridad: la decision de verdad la toma cada servicio al
 * verificar el token. Aqui solo se evita pintar una pantalla que solo podria mostrar 401.
 *
 * `anonymousHome` es lo que ve en la portada (`/`) quien no tiene sesion: la presentacion
 * publica en vez de un rebote al login. Va aqui y no como ruta aparte para que `/` siga
 * siendo una sola direccion: con sesion es el inicio de siempre, dentro del marco, y sin
 * ella es la portada, sin que nadie tenga que adivinar a que URL ir. El resto de rutas
 * protegidas sigue mandando al login y recordando de donde se venia.
 */
export function RequireAuth({
  anonymousHome,
}: {
  anonymousHome?: ReactNode;
} = {}) {
  const { status } = useSession();
  const location = useLocation();

  // Mientras se canjea la cookie todavia no se sabe si hay sesion. Redirigir aqui mandaria
  // a /login a alguien que si la tenia, en cada recarga.
  if (status === 'loading') {
    return (
      <Page>
        <Loading label="Comprobando la sesión..." />
      </Page>
    );
  }

  if (status === 'anonymous') {
    if (anonymousHome && location.pathname === routes.home) {
      return anonymousHome;
    }
    return (
      <Navigate to={routes.login} replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}

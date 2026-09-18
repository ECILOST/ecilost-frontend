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
 */
export function RequireAuth() {
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
    return (
      <Navigate to={routes.login} replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}

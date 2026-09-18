import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { EmptyState } from '@/shared/components/empty-state';
import { buttonClass } from '@/shared/components/ui/button';
import { Page, PageHeader } from '@/shared/components/ui/page';

/**
 * Salas de subasta.
 *
 * Existe porque ecilost-auth-service redirige aqui despues del login
 * (`POST_LOGIN_REDIRECT_URL=http://localhost:5173/rooms`): sin esta ruta, entrar a la
 * aplicacion terminaria en un 404. El contenido llega cuando exista
 * ecilost-auction-service, siguiendo la misma estructura que `features/catalog`.
 */
export function RoomsPage() {
  return (
    <Page>
      <PageHeader eyebrow="Subastas en vivo" title="Salas" />

      <EmptyState
        title="Todavía no hay salas programadas"
        actions={
          <Link className={buttonClass('secondary')} to={routes.items}>
            Ver el catálogo
          </Link>
        }
      >
        Cuando un funcionario programe una sala, aparecerá aquí con su hora de
        inicio y los objetos que se van a subastar.
      </EmptyState>
    </Page>
  );
}

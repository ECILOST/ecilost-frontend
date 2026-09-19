import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useSession } from '@/features/auth/hooks/use-session';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { LotCard } from '../components/lot-card';
import { useLots } from '../hooks/use-lots';
import styles from './lots.page.module.css';

/**
 * Lotes del catalogo (HU-06).
 *
 * Se consulta con cualquier sesion, asi que la lista la ve todo el mundo; crear es de
 * funcionario y esa es la unica decision que se toma aqui por capacidad.
 */
export function LotsPage() {
  const { principal } = useSession();
  const { data: lots, isPending, error, refetch } = useLots();

  return (
    <Page>
      <PageHeader
        eyebrow="Agrupaciones"
        title="Lotes"
        actions={
          principal?.canManageCatalog ? (
            <Link className={buttonClass('primary')} to={routes.newLot}>
              <Icon name="plus" size={18} />
              Crear lote
            </Link>
          ) : null
        }
      />

      <Flash />

      {isPending ? <Loading label="Cargando los lotes..." /> : null}
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {lots?.length === 0 ? (
        <EmptyState
          title="Todavía no hay lotes"
          actions={
            principal?.canManageCatalog ? (
              <Link className={buttonClass('secondary')} to={routes.newLot}>
                Crear el primero
              </Link>
            ) : null
          }
        >
          Un lote agrupa dos o más objetos disponibles para subastarlos juntos.
        </EmptyState>
      ) : null}

      {lots?.length ? (
        <ul className={styles.list}>
          {lots.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </ul>
      ) : null}
    </Page>
  );
}

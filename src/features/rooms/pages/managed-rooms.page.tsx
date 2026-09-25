import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { RoomCard } from '../components/room-card';
import { useRooms } from '../hooks/use-rooms';
import styles from './managed-rooms.page.module.css';

/**
 * Salas de subasta, vistas por quien las programa (HU-15).
 *
 * Toda la pantalla va detras de `canScheduleRooms` en el router, asi que aqui no se vuelve a
 * preguntar por la capacidad.
 */
export function ManagedRoomsPage() {
  const { data: rooms, isPending, error, refetch } = useRooms();

  const scheduleLink = (variant: 'primary' | 'secondary', label: string) => (
    <Link className={buttonClass(variant)} to={routes.newRoom}>
      <Icon name="plus" size={18} />
      {label}
    </Link>
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Subastas"
        title="Salas"
        actions={scheduleLink('primary', 'Programar sala')}
      />

      <Flash />

      {isPending ? <Loading label="Cargando las salas..." /> : null}

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {rooms?.length === 0 ? (
        <EmptyState
          title="Todavía no hay salas"
          actions={scheduleLink('secondary', 'Programar la primera')}
        >
          Una sala reúne rondas encadenadas, cada una con un objeto o un lote y
          su precio mínimo.
        </EmptyState>
      ) : null}

      {rooms?.length ? (
        <ul className={styles.list}>
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </ul>
      ) : null}
    </Page>
  );
}

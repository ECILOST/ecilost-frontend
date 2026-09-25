import { useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { formatEcicoin } from '@/features/wallet/domain/ecicoin';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { Pill } from '@/shared/components/ui/pill';
import { BackLink, Page, PageHeader } from '@/shared/components/ui/page';
import { formatDateTime } from '@/shared/format/date';
import { EntryName } from '../components/entry-name';
import { RoomStatusBadge } from '../components/room-status-badge';
import {
  AUCTIONABLE_KIND_LABELS,
  ROUND_STATUS_LABELS,
} from '../domain/room-status';
import { useRoomDetail } from '../hooks/use-rooms';
import styles from './managed-room-detail.page.module.css';

/**
 * Ficha de una sala programada (HU-15): cuando empieza, cuanto cupo le queda y que se
 * subasta en cada ronda, en orden y con su precio minimo.
 *
 * No hay acciones: el servicio no publica forma de editar ni de cancelar una sala, y la sala
 * avanza sola por sus estados (HU-18).
 */
export function ManagedRoomDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: room, isPending, error, refetch } = useRoomDetail(id);

  if (isPending) {
    return (
      <Page>
        <Loading label="Cargando la sala..." />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageHeader
          title="Sala"
          back={{ to: routes.managedRooms, label: 'Salas' }}
        />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Page>
    );
  }

  return (
    <Page>
      <BackLink to={routes.managedRooms} label="Salas" />

      <Flash />

      <div className={styles.titleBlock}>
        <h1>{room.name}</h1>
        <div className={styles.chips}>
          <RoomStatusBadge status={room.status} />
          <span className={styles.meta}>
            Inicia el {formatDateTime(room.startsAt)}
          </span>
          <span className={styles.meta}>
            {room.admittedCount} de {room.maximumCapacity} cupos ocupados
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rondas ({room.rounds.length})</h2>

        <ol className={styles.rounds}>
          {room.rounds.map((round) => (
            <li key={round.id} className={styles.round}>
              <span className={styles.position}>{round.position}</span>
              <div className={styles.body}>
                {round.entries.map((entry) => (
                  <p
                    key={`${entry.kind}:${entry.catalogId}`}
                    className={styles.entry}
                  >
                    <Pill tone={entry.kind === 'LOT' ? 'purple' : 'blue'}>
                      {AUCTIONABLE_KIND_LABELS[entry.kind]}
                    </Pill>
                    <EntryName entry={entry} />
                  </p>
                ))}
                <p className={styles.price}>
                  Precio mínimo{' '}
                  <strong className="u-numeric">
                    {formatEcicoin(round.startingPrice)} ECICoin
                  </strong>
                </p>
              </div>
              <span className={styles.roundStatus}>
                {ROUND_STATUS_LABELS[round.status]}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className={styles.note}>
        Una sala programada no se puede editar ni cancelar desde aquí: se abre
        sola a su hora, cierra el registro y avanza ronda por ronda.
      </p>
    </Page>
  );
}

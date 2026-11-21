import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { formatEcicoin } from '@/features/wallet/domain/ecicoin';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { MODE_META } from '@/features/auctions/domain/dynamic-modes';
import { Pill } from '@/shared/components/ui/pill';
import { BackLink, Page, PageHeader } from '@/shared/components/ui/page';
import { formatDateTime } from '@/shared/format/date';
import { DynamicModesPanel } from '../components/dynamic-modes-panel';
import { EntryName } from '../components/entry-name';
import { RoomStatusBadge } from '../components/room-status-badge';
import {
  AUCTIONABLE_KIND_LABELS,
  ROUND_STATUS_LABELS,
} from '../domain/room-status';
import { useRoomDetail, useStartRoom } from '../hooks/use-rooms';
import styles from './managed-room-detail.page.module.css';

/**
 * Ficha de una sala programada (HU-15): cuando empieza, cuanto cupo le queda y que se
 * subasta en cada ronda, en orden y con su precio minimo.
 *
 * El dueño puede adelantar el inicio y seguir la sala en vivo.
 */
export function ManagedRoomDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: room, isPending, error, refetch } = useRoomDetail(id);
  const start = useStartRoom(id);
  const [confirmStart, setConfirmStart] = useState(false);

  if (isPending) {
    return (
      <Page>
        <Loading label="Cargando la sala..." skeleton="detail" />
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
            {room.status === 'SCHEDULED' ? 'Inicia el' : 'Inicio de la sala'} {formatDateTime(room.startsAt)}
          </span>
          <span className={styles.meta}>
            {room.admittedCount} de {room.maximumCapacity} cupos ocupados
          </span>
        </div>
      </div>

      {room.isOwner && room.status === 'SCHEDULED' && (
        <div>
          <Button onClick={() => { start.reset(); setConfirmStart(true); }}>Iniciar subasta ahora</Button>
          <ConfirmDialog
            open={confirmStart}
            title="¿Iniciar la subasta ahora?"
            confirmLabel="Iniciar ahora"
            tone="primary"
            busy={start.isPending}
            onCancel={() => setConfirmStart(false)}
            onConfirm={() => start.mutate(undefined, { onSuccess: () => setConfirmStart(false) })}
          >
            La primera ronda empezará y se cerrará el registro. Solo podrán pujar los estudiantes ya admitidos.
            {start.isError && <ErrorState error={start.error} />}
          </ConfirmDialog>
        </div>
      )}

      {/* El dueño sigue su sala en vivo, y despues relee el chat. */}
      {room.isOwner &&
      (room.status === 'ACTIVE' || room.status === 'CLOSED') ? (
        <Link
          className={buttonClass(
            room.status === 'ACTIVE' ? 'primary' : 'secondary',
          )}
          to={routes.managedRoomLive(room.id)}
        >
          {room.status === 'ACTIVE'
            ? 'Ver sala en vivo'
            : 'Ver chat de la sala'}
        </Link>
      ) : null}

      {room.isOwner && (room.dynamicModesEnabled || !room.rounds.some((round) => round.mode && round.mode !== 'CLASSIC'))
        ? <DynamicModesPanel room={room} /> : null}

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
                {round.mode && round.mode !== 'CLASSIC' && (
                  <Pill tone={MODE_META[round.mode].tone}>{MODE_META[round.mode].label}</Pill>
                )}
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
        La sala se abre a su hora o cuando su dueño adelanta el inicio. Al abrirse se cierra el registro y empieza la primera ronda.
      </p>
    </Page>
  );
}

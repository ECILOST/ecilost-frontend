import { Link, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { RoomChat } from '../../components/room-chat';
import { useRoom, useRoomSummary } from '../../hooks/use-room';
import { FollowRoomView } from './follow-room';
import { PublicRoomSummary } from './room-finished';
import styles from './room.module.css';

/** Resultados publicos de la sala cerrada: lo mismo que ve quien la siguio desde afuera. */
function OwnerResults({ roomId }: { roomId: string }) {
  const { data: summary, isPending, isError, error, refetch } = useRoomSummary(roomId);
  if (isPending) return <Loading label="Preparando los resultados..." />;
  if (isError || !summary)
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  return <PublicRoomSummary summary={summary} />;
}

/**
 * La sala en vivo vista por el funcionario que la programo: sigue el precio, las rondas y el
 * chat, sin pujar ni escribir. Cerrada, ve los resultados publicos y el chat. Auction solo le entrega el estado al dueño, asi que otro
 * funcionario que llegue aqui ve el error del servicio.
 */
export function OwnerRoomPage() {
  const { id = '' } = useParams();
  const { data: room, isPending, isError, error, refetch } = useRoom(id);
  const back = {
    to: routes.managedRoom(id),
    label: 'Volver a la sala programada',
  };

  if (room?.status === 'ACTIVE')
    return <FollowRoomView room={room} viewer="owner" />;

  return (
    <>
      <ScreenHeader title={room?.name ?? 'Sala'} back={back} />
      <div className={styles.page}>
        {isPending ? <Loading label="Cargando la sala..." /> : null}
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : null}
        {room?.status === 'SCHEDULED' ? (
          <p className={styles.unavailable}>
            La sala todavía no empieza. Cuando arranque, aquí verás la subasta y
            el chat en vivo.
          </p>
        ) : null}
        {room?.status === 'CLOSED' ? (
          <>
            <OwnerResults roomId={room.id} />
            <div className={styles.finishedChat}>
              <RoomChat roomId={room.id} readOnly />
            </div>
          </>
        ) : null}
        {room ? (
          <div className={styles.finishedActions}>
            <Link className={buttonClass('secondary', 'lg')} to={back.to}>
              {back.label}
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

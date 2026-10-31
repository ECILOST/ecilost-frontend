import { Link, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { RoomChat } from '../../components/room-chat';
import { useRoom } from '../../hooks/use-room';
import { FollowRoomView } from './follow-room';
import styles from './room.module.css';

/**
 * La sala en vivo vista por el funcionario que la programo: sigue el precio, las rondas y el
 * chat, sin pujar ni escribir. Auction solo le entrega el estado al dueño, asi que otro
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
            <p className={styles.unavailable}>
              La subasta terminó. Este es el chat de la sala.
            </p>
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

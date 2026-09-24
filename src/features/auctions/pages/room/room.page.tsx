import { useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { useRoom } from '../../hooks/use-room';
import { FollowRoomView } from './follow-room';
import { LiveRoomView } from './live-room';
import { RoomFinishedView } from './room-finished';
import styles from './room.module.css';
import { WaitingRoomView } from './waiting-room';

/**
 * Una sola direccion por sala, y la pantalla depende de en que punto esta:
 * programada → sala de espera; en curso → en vivo (si se entro a tiempo) o solo
 * seguimiento; cerrada → resumen. La sala cambia de estado sola (inicio, ultima ronda) y
 * la pantalla la sigue sin recargar.
 */
export function RoomPage() {
  const { id = '' } = useParams();
  const { data: room, isPending, isError, error, refetch } = useRoom(id);

  if (isPending || isError || !room) {
    return (
      <>
        <ScreenHeader
          title="Sala"
          back={{ to: routes.home, label: 'Volver al inicio' }}
        />
        <div className={styles.page}>
          {isPending ? <Loading label="Cargando la sala..." /> : null}
          {isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : null}
        </div>
      </>
    );
  }

  if (room.status === 'SCHEDULED') return <WaitingRoomView room={room} />;
  if (room.status === 'CLOSED') return <RoomFinishedView room={room} />;
  if (room.isParticipant) return <LiveRoomView roomId={room.id} />;
  return <FollowRoomView room={room} />;
}

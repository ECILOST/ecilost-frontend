import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { formatDateTime } from '@/shared/format/date';
import type { RoomSummary } from '../model/room';
import { RoomStatusBadge } from './room-status-badge';
import styles from './room-card.module.css';

/**
 * Fila del listado de salas. Lo que decide si una sala es la que se busca es cuando empieza
 * y cuanto cupo le queda, asi que eso va a la vista y no dentro de la ficha.
 */
export function RoomCard({ room }: { room: RoomSummary }) {
  const rounds = room.roundCount === 1 ? '1 ronda' : `${room.roundCount} rondas`;

  return (
    <li className={styles.card}>
      <Link className={styles.link} to={routes.managedRoom(room.id)}>
        <div className={styles.head}>
          <h2 className={styles.name}>{room.name}</h2>
          <RoomStatusBadge status={room.status} />
        </div>
        <p className={styles.when}>Inicia el {formatDateTime(room.startsAt)}</p>
        <p className={styles.meta}>
          {rounds} · {room.admittedCount} de {room.maximumCapacity} cupos
          ocupados
        </p>
      </Link>
    </li>
  );
}

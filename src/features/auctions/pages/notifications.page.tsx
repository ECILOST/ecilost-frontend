import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Icon, type IconName } from '@/shared/components/ui/icon';
import { formatAgo } from '../domain/auction-rules';
import {
  useMarkNotificationsRead,
  useNotifications,
} from '../hooks/use-notifications';
import type { NotificationKind } from '../model/auction';
import styles from './notifications.page.module.css';

/* Un color por significado, el mismo de la sala: verde ganar, rojo te superaron, azul
 * informacion. Siempre con icono y titulo: el color nunca informa solo. */
const KIND: Record<NotificationKind, { icon: IconName; tone: string }> = {
  OUTBID: { icon: 'arrow-up', tone: styles.pink },
  WON: { icon: 'trophy', tone: styles.green },
  PICKUP_READY: { icon: 'check', tone: styles.green },
  ROOM_CLOSED: { icon: 'check', tone: styles.blue },
};

export function NotificationsPage() {
  const { data, isPending, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = data?.some((entry) => !entry.read) ?? false;

  return (
    <div className={styles.page}>
      <section className={styles.list} aria-labelledby="notificaciones">
        <div className={styles.header}>
          <h1 id="notificaciones" className={styles.title}>
            Notificaciones
          </h1>
          <button
            type="button"
            className={styles.markAll}
            disabled={!unread || markRead.isPending}
            onClick={() => markRead.mutate()}
          >
            Marcar todas como leídas
          </button>
        </div>

        {isPending ? <Loading label="Cargando notificaciones..." skeleton="list" /> : null}
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : null}
        {data && data.length === 0 ? (
          <EmptyState title="No tienes notificaciones">
            Te avisaremos aquí cuando te superen, ganes un objeto o una sala
            esté por empezar.
          </EmptyState>
        ) : null}

        <ul className={styles.items}>
          {data?.map((entry) => {
            const kind = KIND[entry.kind];
            const body = (
              <>
                <span
                  className={`${styles.icon} ${kind.tone}`}
                  aria-hidden="true"
                >
                  <Icon name={kind.icon} size={18} />
                </span>
                <span className={styles.text}>
                  <span className={styles.itemTitle}>
                    {entry.read ? null : (
                      <span className="u-sr-only">Sin leer: </span>
                    )}
                    {entry.title}
                  </span>
                  <span className={styles.body}>{entry.body}</span>
                </span>
                <span className={styles.time}>{formatAgo(entry.at)}</span>
              </>
            );
            const className = [styles.item, entry.read ? '' : styles.unread]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={entry.id}>
                {entry.kind === 'PICKUP_READY' ? (
                  <Link
                    className={className}
                    to={
                      entry.pickupRoundId
                        ? routes.pickup(entry.pickupRoundId)
                        : routes.pickups
                    }
                  >
                    {body}
                  </Link>
                ) : entry.roomId ? (
                  <Link className={className} to={routes.room(entry.roomId)}>
                    {body}
                  </Link>
                ) : (
                  <div className={className}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

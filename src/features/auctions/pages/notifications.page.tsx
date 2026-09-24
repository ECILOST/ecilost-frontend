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

const KIND: Record<NotificationKind, { icon: IconName; tone: string }> = {
  OUTBID: { icon: 'arrow-up', tone: styles.pink },
  ROOM_SOON: { icon: 'timer', tone: styles.cyan },
  FOLLOW_ONLY: { icon: 'eye', tone: styles.yellow },
  WON: { icon: 'star', tone: styles.cyan },
  LIMIT: { icon: 'minus', tone: styles.pink },
  ROOM_CLOSED: { icon: 'check', tone: styles.blue },
};

/**
 * La leyenda de estados del diseño: el mismo color significa lo mismo en la sala, en las
 * notificaciones y en mis pujas.
 */
const LEGEND = [
  {
    title: '¡Vas ganando!',
    text: 'Tu oferta es la más alta',
    tone: styles.legendCyan,
  },
  {
    title: '¡Te superaron!',
    text: 'Pujaremos por ti si hay margen',
    tone: styles.legendPink,
  },
  {
    title: '¡Últimos segundos!',
    text: 'La subasta se extendió',
    tone: styles.legendYellow,
  },
  {
    title: '¡Alcanzaste tu límite!',
    text: 'Puja automática detenida',
    tone: styles.legendLimit,
  },
  {
    title: '¡Ganaste este objeto!',
    text: 'La sala sigue con el siguiente',
    tone: styles.legendCyan,
  },
  {
    title: 'La sala finalizó',
    text: 'Resumen de la sala',
    tone: styles.legendNeutral,
  },
];

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

        {isPending ? <Loading label="Cargando notificaciones..." /> : null}
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : null}
        {data && data.length === 0 ? (
          <EmptyState title="No tienes notificaciones" />
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
                  <Icon name={kind.icon} size={15} />
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
                {entry.roomId ? (
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

      <aside className={styles.legend} aria-labelledby="estados">
        <h2 id="estados" className={styles.legendTitle}>
          Estados de la subasta
        </h2>
        <ul className={styles.legendList}>
          {LEGEND.map((entry) => (
            <li
              key={entry.title}
              className={`${styles.legendItem} ${entry.tone}`}
            >
              <span className={styles.legendDot} aria-hidden="true" />
              <span>
                <strong>{entry.title}</strong>
                <small>{entry.text}</small>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

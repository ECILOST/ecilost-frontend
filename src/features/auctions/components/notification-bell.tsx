import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Icon } from '@/shared/components/ui/icon';
import { useNotifications } from '../hooks/use-notifications';
import styles from './notification-bell.module.css';

/** Campana de la cabecera, con punto rosa cuando hay algo sin leer. Solo para quien puja. */
export function NotificationBell() {
  const { data } = useNotifications();
  if (!data) return null;

  const unread = data.filter((entry) => !entry.read).length;

  return (
    <Link
      className={styles.bell}
      to={routes.notifications}
      aria-label={
        unread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'
      }
    >
      <Icon name="bell" size={17} />
      {unread ? <span className={styles.dot} aria-hidden="true" /> : null}
    </Link>
  );
}

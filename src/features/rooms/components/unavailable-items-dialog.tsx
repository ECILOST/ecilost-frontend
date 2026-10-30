import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ItemStatusBadge } from '@/features/catalog/components/item-status-badge';
import { unavailableReason } from '@/features/catalog/domain/item-status';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Icon } from '@/shared/components/ui/icon';
import { useUnavailableItems } from '../hooks/use-unavailable-items';
import styles from './unavailable-items-dialog.module.css';

/**
 * Popup con los objetos que hoy no se pueden subastar y por que.
 *
 * Existe porque el selector de rondas solo ofrece lo disponible, y un objeto que falta ahi sin
 * explicacion parece un error. Aqui el funcionario ve donde esta cada uno (en un lote, en otra
 * ronda, vendido o retirado) y puede abrir su ficha para reponerlo.
 *
 * El contenido es un componente aparte para que las consultas solo corran con el popup abierto.
 */
export function UnavailableItemsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Objetos no disponibles para subastar">
      <Content onClose={onClose} />
    </Dialog>
  );
}

function Content({ onClose }: { onClose: () => void }) {
  const unavailable = useUnavailableItems();

  return (
    <div className={styles.content}>
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>No disponibles para subastar</h2>
          <p className={styles.lead}>
            Estos objetos no aparecen al elegir una ronda. El estado dice por qué.
          </p>
        </div>
        <Button
          variant="quiet"
          className={styles.close}
          aria-label="Cerrar"
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </Button>
      </header>

      {unavailable.isPending ? (
        <Loading label="Buscando objetos no disponibles..." />
      ) : unavailable.error ? (
        <ErrorState error={unavailable.error} onRetry={unavailable.refetch} />
      ) : unavailable.items.length === 0 ? (
        <p className={styles.empty}>
          Todos los objetos del catálogo están disponibles.
        </p>
      ) : (
        <ul className={styles.list}>
          {unavailable.items.map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.info}>
                <Link
                  className={styles.name}
                  to={routes.item(item.id)}
                  onClick={onClose}
                >
                  {item.name}
                </Link>
                <span className={styles.reason}>
                  {unavailableReason(item.status)}
                </span>
              </div>
              <ItemStatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}

      {unavailable.hasMore ? (
        <Button
          variant="secondary"
          disabled={unavailable.isLoadingMore}
          onClick={unavailable.loadMore}
        >
          {unavailable.isLoadingMore ? 'Cargando...' : 'Ver más objetos'}
        </Button>
      ) : null}
    </div>
  );
}

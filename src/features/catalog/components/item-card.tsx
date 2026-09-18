import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { BlobFrame, blobSeed } from '@/shared/components/ui/blob-frame';
import { Pill } from '@/shared/components/ui/pill';
import { formatDate } from '@/shared/format/date';
import { ITEM_CONDITION_LABELS } from '../domain/item-condition';
import type { ItemSummary } from '../model/item';
import { ItemStatusBadge } from './item-status-badge';
import styles from './item-card.module.css';

/**
 * Fila del catalogo.
 *
 * El listado del servicio no trae multimedia a proposito (firmar las URL de cada objeto de
 * la pagina costaria una ronda por objeto), asi que la tarjeta no puede apoyarse en una
 * fotografia. En su lugar cada objeto recibe una mancha de color y una inicial, estables
 * por identificador: el catalogo se ve como una coleccion de piezas distintas y no como una
 * lista de texto, y al abrir la ficha el color coincide.
 */
export function ItemCard({ item }: { item: ItemSummary }) {
  const { tone, shape } = blobSeed(item.id);

  return (
    <li className={styles.card}>
      <Link className={styles.link} to={routes.item(item.id)}>
        <BlobFrame
          className={styles.plate}
          size="sm"
          tone={tone}
          shape={shape}
          fallback={item.name.charAt(0).toUpperCase()}
        />

        <div className={styles.body}>
          <div className={styles.top}>
            <h2 className={styles.title}>{item.name}</h2>
            <ItemStatusBadge status={item.status} />
          </div>

          <p className={styles.description}>{item.description}</p>

          <div className={styles.meta}>
            <Pill tone="blue">{item.category}</Pill>
            <span>{ITEM_CONDITION_LABELS[item.condition]}</span>
            <span className={styles.dot} aria-hidden="true" />
            <span>Registrado el {formatDate(item.registeredAt)}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

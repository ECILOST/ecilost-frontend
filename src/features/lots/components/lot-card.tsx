import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { formatDate } from '@/shared/format/date';
import type { Lot } from '../model/lot';
import { LotStatusBadge } from './lot-status-badge';
import styles from './lot-card.module.css';

/**
 * Fila del listado de lotes.
 *
 * Enseña los nombres de los objetos y no solo cuantos son: un lote se reconoce por lo que
 * lleva dentro, y "3 objetos" obliga a abrirlo para saber si es el que se busca. El listado
 * los trae ya, asi que enseñarlos no cuesta ninguna peticion.
 */
export function LotCard({ lot }: { lot: Lot }) {
  return (
    <li className={styles.card}>
      <Link className={styles.link} to={routes.lot(lot.id)}>
        <div className={styles.head}>
          <h2 className={styles.name}>{lot.name}</h2>
          <LotStatusBadge status={lot.status} />
        </div>

        <p className={styles.items}>
          {lot.items.map((item) => item.name).join(' · ')}
        </p>

        <p className={styles.meta}>
          {lot.items.length} objetos · armado el {formatDate(lot.createdAt)}
        </p>
      </Link>
    </li>
  );
}

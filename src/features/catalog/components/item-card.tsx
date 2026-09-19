import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { BlobFrame, blobSeed } from '@/shared/components/ui/blob-frame';
import { Pill } from '@/shared/components/ui/pill';
import { ITEM_CONDITION_LABELS } from '../domain/item-condition';
import type { ItemSummary } from '../model/item';
import { ItemStatusBadge } from './item-status-badge';
import styles from './item-card.module.css';

/**
 * Tarjeta del catalogo.
 *
 * Enseña la portada que firma el servicio, que es la primera fotografia del objeto. Un
 * objeto perdido se reconoce mirandolo, no leyendo su nombre.
 *
 * Cuando todavia no tiene ninguna, en su lugar va el collage de color con la inicial,
 * estable por identificador: asi el catalogo sigue viendose como una coleccion de piezas y
 * no como una lista de texto con huecos, y al abrir la ficha los colores coinciden.
 */
export function ItemCard({ item }: { item: ItemSummary }) {
  const { palette, shape } = blobSeed(item.id);

  return (
    <li className={styles.card}>
      <Link className={styles.link} to={routes.item(item.id)}>
        <div className={styles.media}>
          <span className={styles.badge}>
            <ItemStatusBadge status={item.status} solid />
          </span>
          <BlobFrame
            className={styles.plate}
            size="sm"
            palette={palette}
            shape={shape}
            src={item.coverUrl}
            // Decorativa a proposito: el nombre del objeto va justo debajo, en texto. Con
            // texto alternativo, un lector de pantalla anunciaria el mismo objeto dos veces.
            alt=""
            fit="cover"
            fallback={item.name.charAt(0).toUpperCase()}
          />
        </div>

        <div className={styles.body}>
          <h2 className={styles.title}>{item.name}</h2>
          <p className={styles.description}>{item.description}</p>

          {/*
            Categoria y estado fisico y nada mas: en una rejilla de dos columnas, la fecha
            de registro alargaba la tarjeta tres lineas para un dato que solo importa en la
            ficha.
          */}
          <div className={styles.meta}>
            <Pill tone="blue">{item.category}</Pill>
            <span>{ITEM_CONDITION_LABELS[item.condition]}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * Hueco con la forma de una tarjeta, para mientras llega el catalogo.
 *
 * Reserva el sitio que van a ocupar las tarjetas de verdad, asi que la rejilla no da un
 * salto al llegar los datos. Se oculta a los lectores de pantalla: no es contenido, y quien
 * escucha ya recibe el aviso de carga por otro lado.
 */
export function ItemCardSkeleton() {
  return (
    <li className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <div className={styles.link}>
        <div className={styles.media} />
        <div className={styles.body}>
          <span className={styles.ghost} />
          <span className={`${styles.ghost} ${styles.ghostShort}`} />
        </div>
      </div>
    </li>
  );
}

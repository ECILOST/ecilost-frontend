import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { CoinAmount } from '@/shared/components/ui/coin';
import { Icon } from '@/shared/components/ui/icon';
import { ItemArt } from '@/shared/components/ui/item-art';
import {
  formatCountdown,
  formatWhen,
  roomNumber,
} from '../domain/auction-rules';
import { useCountdown } from '../hooks/use-countdown';
import type { AuctionItem } from '../model/auction';
import styles from './auction-card.module.css';

/** Linea de estado bajo el precio: cuenta atras si esta en vivo, fecha si viene despues. */
export function AuctionMeta({ item }: { item: AuctionItem }) {
  const remaining = useCountdown(item.status === 'LIVE' ? item.endsAt : null);

  if (item.status === 'LIVE') {
    return (
      <p className={`${styles.meta} ${styles.live}`}>
        <Icon name="timer" size={12} />
        <span className="u-numeric">{formatCountdown(remaining, true)}</span> ·
        Sala {roomNumber(item.roomName)}
      </p>
    );
  }
  if (item.status === 'UPCOMING') {
    return <p className={styles.meta}>Próxima · {formatWhen(item.startsAt)}</p>;
  }
  return (
    <p className={styles.meta}>
      Finalizada · {item.awarded ? 'adjudicada' : 'sin ofertas'}
    </p>
  );
}

/**
 * Tarjeta del catalogo y de la portada: el objeto sobre su collage, la capsula "En vivo"
 * encima, y debajo nombre, precio y estado. Toda la tarjeta es un enlace a la ficha.
 */
export function AuctionCard({
  item,
  order = 'price-first',
}: {
  item: AuctionItem;
  /** La portada pone la fecha antes que el precio; el catalogo, al reves. */
  order?: 'price-first' | 'meta-first';
}) {
  const live = item.status === 'LIVE';
  const price = (
    <CoinAmount value={item.currentPrice} size="md" className={styles.price} />
  );

  return (
    <Link
      className={[styles.card, live ? styles.cardLive : '']
        .filter(Boolean)
        .join(' ')}
      to={routes.auction(item.id)}
    >
      <ItemArt seed={item.id} label={item.name} src={item.imageUrl}>
        {live ? <span className={styles.badge}>En vivo</span> : null}
      </ItemArt>
      <div className={styles.body}>
        <h3 className={styles.name}>{item.name}</h3>
        {order === 'price-first' ? (
          <>
            {price}
            <AuctionMeta item={item} />
          </>
        ) : (
          <>
            <AuctionMeta item={item} />
            {price}
          </>
        )}
      </div>
    </Link>
  );
}

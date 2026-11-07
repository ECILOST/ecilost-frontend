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
  variant = 'default',
}: {
  item: AuctionItem;
  /** La portada pone la fecha antes que el precio; el catalogo, al reves. */
  order?: 'price-first' | 'meta-first';
  /**
   * `feature`: tarjeta ancha para las subastas en vivo, lo primero que se ve del catalogo.
   * `default`: la de la grilla. Las finalizadas se atenuan solas.
   */
  variant?: 'default' | 'feature';
}) {
  const live = item.status === 'LIVE';
  const closed = item.status === 'CLOSED';
  const price = (
    <CoinAmount
      value={item.currentPrice}
      size={variant === 'feature' ? 'xl' : 'md'}
      className={styles.price}
    />
  );

  return (
    <Link
      className={[
        styles.card,
        live ? styles.cardLive : '',
        closed ? styles.cardClosed : '',
        variant === 'feature' ? styles.feature : '',
      ]
        .filter(Boolean)
        .join(' ')}
      to={routes.auction(item.id)}
    >
      <ItemArt
        seed={item.id}
        label={item.name}
        src={item.imageUrl}
        className={styles.art}
      >
        {live ? (
          <span className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            En vivo
          </span>
        ) : closed ? (
          <span className={`${styles.badge} ${styles.badgeClosed}`}>
            {item.awarded ? 'Adjudicada' : 'Sin ofertas'}
          </span>
        ) : null}
      </ItemArt>
      <div className={styles.body}>
        {item.category ? (
          <span className={styles.category}>{item.category}</span>
        ) : null}
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
        {variant === 'feature' && live ? (
          <span className={styles.cta}>
            <Icon name="bolt" size={16} /> Entrar a pujar
          </span>
        ) : null}
      </div>
    </Link>
  );
}

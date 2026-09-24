import { Link, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { CoinAmount, formatCoins } from '@/shared/components/ui/coin';
import { CountdownRing } from '@/shared/components/ui/countdown-ring';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill } from '@/shared/components/ui/pill';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { StatBox } from '@/shared/components/ui/stat-box';
import {
  formatCountdown,
  formatWhen,
  roomNumber,
  roundProgress,
} from '../domain/auction-rules';
import { useAuctionItem } from '../hooks/use-auction-items';
import { useCountdown } from '../hooks/use-countdown';
import type { AuctionItem } from '../model/auction';
import styles from './auction-detail.page.module.css';

function StatusBadge({ item }: { item: AuctionItem }) {
  if (item.status === 'LIVE') {
    return (
      <Pill tone="pink" live>
        En vivo
      </Pill>
    );
  }
  if (item.status === 'UPCOMING') return <Pill tone="cyan">Próxima</Pill>;
  return <Pill tone="neutral">Finalizada</Pill>;
}

function Actions({ item }: { item: AuctionItem }) {
  if (item.status === 'LIVE') {
    return (
      <>
        <Link
          className={buttonClass('bid', 'block')}
          to={routes.room(item.roomId)}
        >
          ⚡ Pujar {formatCoins(item.nextBid)} ECICoin
        </Link>
        {item.buyNowPrice !== null ? (
          <Link
            className={buttonClass('secondary', 'block')}
            to={routes.room(item.roomId)}
          >
            🛒 Comprar ahora · {formatCoins(item.buyNowPrice)}
          </Link>
        ) : null}
      </>
    );
  }
  if (item.status === 'UPCOMING') {
    return (
      <Link
        className={buttonClass('primary', 'block')}
        to={routes.room(item.roomId)}
      >
        Ir a la sala de espera
      </Link>
    );
  }
  return (
    <Link className={buttonClass('secondary', 'block')} to={routes.auctions}>
      Esta subasta terminó · ver otras
    </Link>
  );
}

/** Ficha de un objeto en subasta. Pujar se hace dentro de la sala: el boton lleva alli. */
export function AuctionDetailPage() {
  const { id = '' } = useParams();
  const { data: item, isPending, isError, error, refetch } = useAuctionItem(id);
  const remaining = useCountdown(item?.endsAt ?? null);

  return (
    <>
      <ScreenHeader
        title="Detalle del objeto"
        back={{ to: routes.auctions, label: 'Volver al catálogo' }}
        badges={item ? <StatusBadge item={item} /> : null}
        aside={
          item ? (
            <span>
              {item.roomName} · Objeto {item.position} de {item.roomSize}
            </span>
          ) : null
        }
      />

      <div className={styles.page}>
        {isPending ? <Loading label="Cargando el objeto..." /> : null}
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : null}

        {item ? (
          <div className={styles.grid}>
            <ItemArt
              seed={item.id}
              label={item.name}
              src={item.imageUrl}
              variant="hero"
              className={styles.art}
            />

            <div className={styles.info}>
              <h1 className={styles.name}>{item.name}</h1>
              <p className={styles.description}>{item.description}</p>

              <div className={styles.priceRow}>
                <div>
                  <span className={styles.label}>
                    {item.status === 'CLOSED'
                      ? 'Precio final'
                      : item.status === 'LIVE'
                        ? 'Precio actual'
                        : 'Precio base'}
                  </span>
                  <CoinAmount value={item.currentPrice} size="hero" />
                  {item.status === 'LIVE' ? (
                    <span className={styles.hint}>
                      Siguiente puja {formatCoins(item.nextBid)} ECICoin
                    </span>
                  ) : item.status === 'UPCOMING' ? (
                    <span className={styles.hint}>
                      La sala abre {formatWhen(item.startsAt).toLowerCase()}
                    </span>
                  ) : null}
                </div>
                {item.status === 'LIVE' ? (
                  <CountdownRing
                    size={104}
                    label="Restante"
                    time={formatCountdown(remaining)}
                    progress={roundProgress(
                      item.roundStartedAt,
                      item.endsAt,
                      remaining,
                    )}
                  />
                ) : null}
              </div>

              <div className={styles.stats}>
                <StatBox label="Categoría" value={item.category} />
                <StatBox label="Estado" value={item.condition} />
                <StatBox label="Sala" value={roomNumber(item.roomName)} />
              </div>

              <div className={styles.actions}>
                <Actions item={item} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

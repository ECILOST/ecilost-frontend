import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { CoinAmount } from '@/shared/components/ui/coin';
import { CountdownRing } from '@/shared/components/ui/countdown-ring';
import { ItemArt } from '@/shared/components/ui/item-art';
import { AuctionCard } from '../components/auction-card';
import { formatCountdown, roundProgress } from '../domain/auction-rules';
import { useAuctionItems } from '../hooks/use-auction-items';
import { useCountdown } from '../hooks/use-countdown';
import type { AuctionItem } from '../model/auction';
import styles from './home.page.module.css';
import { Icon, type IconName } from '@/shared/components/ui/icon';

/** Los tres pasos de la plataforma, para quien llega por primera vez. */
const HOW: Array<{
  icon: IconName;
  title: string;
  text: string;
  tone: string;
}> = [
  {
    icon: 'search',
    title: 'Descubre',
    text: 'Explora los objetos perdidos del campus que salen a subasta.',
    tone: 'var(--eci-cyan)',
  },
  {
    icon: 'bolt',
    title: 'Puja con ECICoin',
    text: 'Únete a la sala antes de que empiece y puja en vivo.',
    tone: 'var(--eci-pink)',
  },
  {
    icon: 'trophy',
    title: 'Gana',
    text: 'Si tu puja es la más alta al cerrar, el objeto es tuyo.',
    tone: 'var(--eci-green)',
  },
];

function Featured({ item }: { item: AuctionItem }) {
  const remaining = useCountdown(item.endsAt);
  const live = item.status === 'LIVE';

  return (
    <div className={styles.featured}>
      <ItemArt
        seed={item.id}
        label={item.name}
        src={item.imageUrl}
        className={styles.featuredArt}
      />
      {live ? (
        <CountdownRing
          className={styles.ring}
          size={100}
          time={formatCountdown(remaining)}
          progress={roundProgress(item.roundStartedAt, item.endsAt, remaining)}
        />
      ) : null}
      <div className={styles.floating}>
        <h2 className={styles.floatingName}>{item.name}</h2>
        <span className={styles.label}>
          {live ? 'Precio actual' : 'Precio base'}
        </span>
        <CoinAmount value={item.currentPrice} size="xl" unit />
        <Link
          className={buttonClass('bid', 'md')}
          to={routes.room(item.roomId)}
        >
          <Icon name={live ? 'bolt' : 'play'} size={16} />
          {live ? 'Pujar' : 'Ver la sala'}
        </Link>
      </div>
    </div>
  );
}

/**
 * Portada de quien puja: la subasta destacada y las proximas.
 *
 * La destacada es la que esta en vivo en una sala donde la persona participa; si no hay,
 * cualquiera en vivo; y si tampoco, la proxima en empezar.
 */
export function HomePage() {
  const { data: items, isPending, isError, error, refetch } = useAuctionItems();

  const live = items?.filter((item) => item.status === 'LIVE') ?? [];
  const upcoming = items?.filter((item) => item.status === 'UPCOMING') ?? [];
  const featured = live[0] ?? upcoming[0];
  const next = [
    ...upcoming.filter((item) => item !== featured).slice(0, 3),
    ...live.filter((item) => item !== featured).slice(0, 1),
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span
          className={`${styles.blob} ${styles.blobBlue}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.blob} ${styles.blobCyan}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.blob} ${styles.blobYellow}`}
          aria-hidden="true"
        />
        <span
          className={`${styles.blob} ${styles.blobPink}`}
          aria-hidden="true"
        />
        <span className={styles.sticker} aria-hidden="true">
          ¡Puede ser
          <br />
          tuyo!
        </span>

        <div className={styles.heroGrid}>
          <div>
            <span className={styles.kicker}>
              <span className={styles.kickerDot} aria-hidden="true" />
              Subastas en vivo · Campus ECI
            </span>
            <h1 className={styles.title}>
              Objetos perdidos,
              <br />
              <span className={styles.accent}>nuevas historias</span>
            </h1>
            <p className={styles.lead}>
              Tu universidad también tiene tesoros perdidos. Descubre, puja y
              llévatelos en subastas en vivo con ECICoin.
            </p>
            <div className={styles.actions}>
              <Link
                className={buttonClass('primary', 'lg')}
                to={routes.auctions}
              >
                Ver subastas →
              </Link>
              {featured ? (
                <Link
                  className={buttonClass('secondary', 'lg')}
                  to={routes.room(featured.roomId)}
                >
                  Entrar a la sala en vivo
                </Link>
              ) : null}
            </div>
          </div>

          {featured ? <Featured item={featured} /> : null}
        </div>
      </section>

      <section className={styles.how} aria-label="Cómo funciona">
        {HOW.map((step, index) => (
          <div
            key={step.title}
            className={styles.howStep}
            style={{ '--tone': step.tone } as CSSProperties}
          >
            <span className={styles.howIcon} aria-hidden="true">
              <Icon name={step.icon} size={20} />
            </span>
            <span className={styles.howNumber} aria-hidden="true">
              0{index + 1}
            </span>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </div>
        ))}
        <Link className={styles.howGuide} to={routes.dynamicGuide}>
          <strong>Subastas dinámicas</strong>
          <p>
            Holandesa, sobre cerrado y lote misterioso: cada ronda puede jugarse
            distinto.
          </p>
          <span>
            Ver cómo se juega <Icon name="arrow-right" size={14} />
          </span>
        </Link>
      </section>

      <section className={styles.upcoming} aria-labelledby="proximas">
        <div className={styles.sectionHeader}>
          <h2 id="proximas" className={styles.sectionTitle}>
            Próximas subastas
          </h2>
          <Link className={styles.more} to={routes.auctions}>
            Ver todas →
          </Link>
        </div>

        {isPending ? <Loading label="Cargando subastas..." /> : null}
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : null}
        {items ? (
          <div className={styles.cards}>
            {next.map((item) => (
              <AuctionCard key={item.id} item={item} order="meta-first" />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

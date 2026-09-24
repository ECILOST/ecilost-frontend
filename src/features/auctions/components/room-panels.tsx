import { CoinAmount } from '@/shared/components/ui/coin';
import { Icon, type IconName } from '@/shared/components/ui/icon';
import { ItemArt } from '@/shared/components/ui/item-art';
import { formatAgo, formatCountdown } from '../domain/auction-rules';
import { useCountdown } from '../hooks/use-countdown';
import type { Bid, Room, RoomActivity, Round } from '../model/auction';
import styles from './room-panels.module.css';

const AVATAR_COLORS = [
  'var(--eci-purple)',
  'var(--eci-blue)',
  'var(--eci-pink)',
  'var(--eci-yellow)',
  'var(--eci-cyan)',
];

function avatarColor(alias: string): string {
  let hash = 0;
  for (const char of alias) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Pujas recientes: la propia resaltada, la mas nueva arriba. Es una region en vivo. */
export function RecentBids({ bids }: { bids: Bid[] }) {
  return (
    <section className={styles.section} aria-labelledby="pujas-recientes">
      <h2 id="pujas-recientes" className={styles.heading}>
        Pujas recientes
      </h2>
      {bids.length === 0 ? (
        <p className={styles.empty}>Todavía nadie ha pujado en esta ronda.</p>
      ) : (
        <ol className={styles.bids} aria-live="polite">
          {bids.map((bid) => (
            <li
              key={bid.id}
              className={[styles.bid, bid.mine ? styles.mine : '']
                .filter(Boolean)
                .join(' ')}
            >
              <span
                className={styles.avatar}
                style={{
                  background: bid.mine
                    ? 'linear-gradient(135deg, var(--eci-cyan), var(--eci-blue))'
                    : avatarColor(bid.alias),
                }}
                aria-hidden="true"
              />
              <span className={styles.alias}>{bid.alias}</span>
              <CoinAmount
                value={bid.amount}
                size="sm"
                tone={bid.mine ? 'yellow' : 'plain'}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const ACTIVITY_ICON: Record<
  RoomActivity['kind'],
  { icon: IconName; tone: string }
> = {
  BID: { icon: 'arrow-up', tone: styles.pinkIcon },
  OUTBID: { icon: 'arrow-down', tone: styles.greyIcon },
  AWARDED: { icon: 'check', tone: styles.cyanIcon },
  STARTED: { icon: 'play', tone: styles.blueIcon },
};

export function RoomActivityList({
  activity,
  title = 'Actividad de la sala',
}: {
  activity: RoomActivity[];
  title?: string;
}) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.heading}>{title}</h2>
      <ul className={styles.activity}>
        {activity.map((entry) => {
          const { icon, tone } = ACTIVITY_ICON[entry.kind];
          return (
            <li key={entry.id} className={styles.event}>
              <span
                className={`${styles.eventIcon} ${tone}`}
                aria-hidden="true"
              >
                <Icon name={icon} size={13} />
              </span>
              <span>
                <span className={styles.eventText}>{entry.text}</span>
                <span className={styles.eventTime}>{formatAgo(entry.at)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Siguiente objeto" con cuanto falta para que empiece su ronda. */
export function NextItem({
  room,
  active,
}: {
  room: Room;
  active: Round | null;
}) {
  const next = room.rounds.find((round) => round.status === 'SCHEDULED');
  const remaining = useCountdown(active?.endsAt ?? null);
  if (!next) return null;

  return (
    <section className={styles.next} aria-label="Siguiente objeto">
      <span className={styles.nextLabel}>Siguiente objeto</span>
      <div className={styles.nextRow}>
        <ItemArt seed={next.itemId} label={next.itemName} variant="thumb" />
        <div>
          <div className={styles.nextName}>{next.itemName}</div>
          <div className={styles.nextMeta}>
            Ronda {next.position}
            {active ? ` · comienza en ${formatCountdown(remaining)}` : ''}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Los objetos de la sala en orden: finalizados atenuados, el que esta en subasta resaltado
 * en rosa, los proximos con su ronda. `compact` es la version sin miniatura (solo
 * seguimiento).
 */
export function RoomItemsStrip({
  room,
  compact = false,
}: {
  room: Room;
  compact?: boolean;
}) {
  const closed = room.rounds.filter(
    (round) => round.status === 'CLOSED',
  ).length;
  const live = room.rounds.filter((round) => round.status === 'ACTIVE').length;
  const upcoming = room.rounds.length - closed - live;

  return (
    <section className={styles.strip} aria-labelledby="objetos-sala">
      <div className={styles.stripHeader}>
        <h2 id="objetos-sala" className={styles.heading}>
          Objetos de la sala
        </h2>
        <span className={styles.stripCount}>
          {compact
            ? `${closed} finalizados · ${live} en subasta · ${upcoming} próximos`
            : `${room.rounds.length} objetos · ${closed} finalizados`}
        </span>
      </div>
      <ol className={styles.stripList}>
        {room.rounds.map((round, index) => {
          const isLive = round.status === 'ACTIVE';
          const isClosed = round.status === 'CLOSED';
          const firstUpcoming =
            room.rounds.findIndex((r) => r.status === 'SCHEDULED') === index;
          return (
            <li
              key={round.id}
              className={[
                styles.stripItem,
                isLive ? styles.stripLive : '',
                isClosed ? styles.stripClosed : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isLive ? 'step' : undefined}
            >
              {compact ? null : (
                <ItemArt
                  seed={round.itemId}
                  label={round.itemName}
                  variant="thumb"
                  className={styles.stripThumb}
                />
              )}
              <span className={styles.stripName}>
                {compact ? `${String(round.position).padStart(2, '0')} ` : ''}
                {round.itemName}
              </span>
              <span
                className={[
                  styles.stripState,
                  isLive
                    ? styles.stateLive
                    : firstUpcoming
                      ? styles.stateNext
                      : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {isClosed
                  ? `✓ Finalizado${compact ? '' : ` · ${round.currentPrice}`}`
                  : isLive
                    ? `● En subasta${compact ? '' : ` · ${round.currentPrice}`}`
                    : compact
                      ? 'Próximo'
                      : `Próximo · Ronda ${round.position}`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

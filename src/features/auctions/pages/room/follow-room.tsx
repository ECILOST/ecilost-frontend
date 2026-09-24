import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { CoinAmount } from '@/shared/components/ui/coin';
import { CountdownRing } from '@/shared/components/ui/countdown-ring';
import { Icon } from '@/shared/components/ui/icon';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill } from '@/shared/components/ui/pill';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { StatBox } from '@/shared/components/ui/stat-box';
import {
  NextItem,
  RecentBids,
  RoomActivityList,
  RoomItemsStrip,
} from '../../components/room-panels';
import { formatCountdown, roundProgress } from '../../domain/auction-rules';
import { useCountdown } from '../../hooks/use-countdown';
import { useLiveRoom } from '../../hooks/use-live-room';
import type { Room } from '../../model/auction';
import styles from './room.module.css';

/**
 * Sala en curso para quien no entro antes del inicio (HU-27: cierre de acceso). Ve lo mismo
 * en tiempo real, pero sin pujar, y se le dice por que antes que nada.
 */
export function FollowRoomView({ room }: { room: Room }) {
  const {
    data: live,
    isPending,
    isError,
    error,
    refetch,
  } = useLiveRoom(room.id);
  const round = live?.round ?? null;
  const remaining = useCountdown(round?.endsAt ?? null, live?.serverTime);
  const pending = room.rounds.filter((r) => r.status === 'SCHEDULED').length;

  return (
    <>
      <ScreenHeader
        title={room.name}
        back={{ to: routes.home, label: 'Volver al inicio' }}
        badges={<Pill tone="yellow">Subasta en curso · Solo seguimiento</Pill>}
        aside={
          round ? (
            <span className={styles.chip}>
              Objeto {round.position} de {room.rounds.length}
            </span>
          ) : null
        }
      />

      <div className={styles.bannerWrap}>
        <div className={styles.banner} role="status">
          <span className={styles.bannerIcon} aria-hidden="true">
            <Icon name="eye" size={17} />
          </span>
          <div className={styles.bannerText}>
            <p className={styles.bannerTitle}>
              El ingreso a esta sala cerró al iniciar la subasta
            </p>
            <p className={styles.bannerSub}>
              Puedes seguir la actividad en tiempo real, pero no participar en
              las pujas.
            </p>
          </div>
          <Link className={buttonClass('primary')} to={routes.auctions}>
            Explorar próximas salas
          </Link>
        </div>
      </div>

      <div className={`${styles.page} ${styles.pageTight}`}>
        {isPending ? <Loading label="Cargando la sala..." /> : null}
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : null}

        {live ? (
          <div className={styles.grid}>
            <div className={styles.main}>
              {round ? (
                <>
                  <ItemArt
                    seed={round.itemId}
                    label={round.itemName}
                    variant="hero"
                    dimmed
                    className={styles.followArt}
                  >
                    <CountdownRing
                      className={styles.ring}
                      size={112}
                      time={formatCountdown(remaining)}
                      progress={roundProgress(
                        round.startedAt,
                        round.endsAt,
                        remaining,
                      )}
                    />
                  </ItemArt>
                  <div className={styles.summary}>
                    <div>
                      <h2 className={styles.itemName}>{round.itemName}</h2>
                      <span className={styles.label}>Precio actual</span>
                      <CoinAmount value={round.currentPrice} size="hero" unit />
                    </div>
                    <div className={styles.stats}>
                      <StatBox
                        align="center"
                        label="Participantes"
                        value={live.participants}
                      />
                      <StatBox
                        align="center"
                        label="Objetos pendientes"
                        value={pending}
                      />
                    </div>
                  </div>
                </>
              ) : null}
              <p className={styles.unavailable}>
                ⚡ Pujar no disponible · esta sala ya inició
              </p>
              <div className={styles.strip}>
                <RoomItemsStrip room={live.room} compact />
              </div>
            </div>

            <aside className={styles.side}>
              <RecentBids bids={live.bids} />
              <RoomActivityList
                activity={live.activity}
                title="Actividad reciente"
              />
              <NextItem room={live.room} active={round} />
              <Link
                className={buttonClass('secondary', 'lg')}
                to={routes.myBids}
              >
                Ver mis subastas
              </Link>
            </aside>
          </div>
        ) : null}
      </div>
    </>
  );
}

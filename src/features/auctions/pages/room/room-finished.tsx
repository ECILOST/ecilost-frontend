import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { CoinAmount } from '@/shared/components/ui/coin';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill } from '@/shared/components/ui/pill';
import { useRoomSummary } from '../../hooks/use-room';
import type { Room, RoomOutcome } from '../../model/auction';
import styles from './room.module.css';

const OUTCOME: Record<
  RoomOutcome,
  { label: string; tone: 'cyan' | 'pink' | 'neutral'; row: string }
> = {
  WON: { label: 'Ganado', tone: 'cyan', row: styles.resumeWon },
  LOST: { label: 'Perdido', tone: 'pink', row: styles.resumeLost },
  NO_BID: { label: 'Sin ofertar', tone: 'neutral', row: '' },
};

const WHEN = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** Resumen al cerrar la sala: que se gano, que se perdio y cuanto se gasto. */
export function RoomFinishedView({ room }: { room: Room }) {
  const {
    data: summary,
    isPending,
    isError,
    error,
    refetch,
  } = useRoomSummary(room.id);

  if (isPending)
    return (
      <div className={styles.page}>
        <Loading label="Preparando el resumen..." />
      </div>
    );
  if (isError || !summary) {
    return (
      <div className={styles.page}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const count = (outcome: RoomOutcome) =>
    summary.rows.filter((row) => row.outcome === outcome).length;

  return (
    <div className={`${styles.page} ${styles.finished}`}>
      <div className={styles.finishedHead}>
        <div>
          <h1 className={styles.finishedTitle}>La sala finalizó</h1>
          <p className={styles.finishedMeta}>
            {summary.roomName} · {summary.items} objetos ·{' '}
            {summary.participants} participantes ·{' '}
            {WHEN.format(new Date(summary.closedAt))}
          </p>
        </div>
        {room.isParticipant ? (
          <div className={styles.counters}>
            <span className={`${styles.counter} ${styles.counterWon}`}>
              <strong>{count('WON')}</strong>Ganados
            </span>
            <span className={`${styles.counter} ${styles.counterLost}`}>
              <strong>{count('LOST')}</strong>Perdidos
            </span>
            <span className={styles.counter}>
              <strong>{count('NO_BID')}</strong>Sin ofertar
            </span>
          </div>
        ) : null}
      </div>

      <h2 className={styles.resumeTitle}>Resumen de la sala</h2>
      <ul className={styles.resume}>
        {summary.rows.map((row) => {
          const outcome = OUTCOME[row.outcome];
          return (
            <li
              key={row.itemId}
              className={[styles.resumeRow, outcome.row]
                .filter(Boolean)
                .join(' ')}
            >
              <ItemArt seed={row.itemId} label={row.itemName} variant="thumb" />
              <div className={styles.resumeText}>
                <span className={styles.resumeName}>{row.itemName}</span>
                <span className={styles.resumeDetail}>{row.detail}</span>
                {row.amount !== null ? (
                  <CoinAmount value={row.amount} size="sm" />
                ) : null}
              </div>
              <Pill tone={outcome.tone} solid={row.outcome !== 'NO_BID'}>
                {outcome.label}
              </Pill>
            </li>
          );
        })}
        <li className={`${styles.resumeRow} ${styles.total}`}>
          <span className={styles.totalBadge} aria-hidden="true">
            EC
          </span>
          <div className={styles.resumeText}>
            <span className={styles.resumeName}>Total gastado en la sala</span>
            <span className={styles.resumeDetail}>
              Se liberó el saldo comprometido restante
            </span>
          </div>
          <CoinAmount value={summary.totalSpent} size="lg" />
        </li>
      </ul>

      <div className={styles.finishedActions}>
        <Link className={buttonClass('primary', 'lg')} to={routes.myBids}>
          Ver mis pujas
        </Link>
        <Link className={buttonClass('secondary', 'lg')} to={routes.auctions}>
          Explorar próximas salas
        </Link>
      </div>
    </div>
  );
}

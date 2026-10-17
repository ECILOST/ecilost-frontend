import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import { Dialog } from '@/shared/components/ui/dialog';
import { Pill } from '@/shared/components/ui/pill';
import { useSealedResults } from '../../hooks/use-live-room';
import type { Round } from '../../model/auction';
import styles from './dynamic.module.css';

/** Cuantos sobres se listan uno a uno; el resto se resume. */
const ROWS_SHOWN = 5;

/**
 * Apertura de sobres: el ranking de todos los sobres de la ronda, con el propio marcado. Los
 * de los demas van sin nombre: se sabe el puesto y el monto, no de quien es.
 */
export function SealedResultsDialog({ round, onClose }: { round: Round; onClose: () => void }) {
  const { data, isPending, error } = useSealedResults(round.id);
  const mine = data?.ranking.find((row) => row.mine) ?? null;
  const winner = data?.ranking.find((row) => row.winner) ?? null;
  const shown = data?.ranking.slice(0, ROWS_SHOWN) ?? [];
  const rest = data ? data.ranking.length - shown.length : 0;
  const mineHidden = mine !== null && mine.rank > ROWS_SHOWN;

  return (
    <Dialog open onClose={onClose} title="Se abrieron los sobres" tone={round.wonByMe ? 'cyan' : 'neutral'} size="lg">
      <div className={styles.rouletteBody} style={{ justifyItems: 'stretch', textAlign: 'left' }}>
        <div className={styles.row}>
          <div>
            <Pill tone="blue">✉ Sobre cerrado · ronda {round.position}</Pill>
            <h2 className={styles.rouletteTitle} style={{ marginTop: '0.5rem' }}>
              {round.wonByMe ? '¡Ganaste! Tu sobre fue el más alto' : 'Se abrieron los sobres'}
            </h2>
            <p className={styles.muted}>
              {round.itemName} · {data?.sealedCount ?? '…'} sobres sellados
            </p>
          </div>
        </div>

        {isPending ? <Loading label="Abriendo los sobres..." /> : null}
        {error ? <ErrorState error={error} /> : null}

        {data ? (
          <>
            <ol className={styles.ranking}>
              {shown.map((row) => (
                <li
                  key={row.rank}
                  className={[styles.rank, row.winner ? styles.rankWinner : '', row.mine ? styles.rankMine : ''].join(' ')}
                >
                  <strong>{row.rank}</strong>
                  <span>
                    {row.mine ? 'Tú' : `Participante ${row.rank}`}{' '}
                    {row.winner ? <Pill tone="cyan">Gana</Pill> : null}
                  </span>
                  <strong style={{ color: row.winner ? 'var(--eci-yellow)' : undefined }}>{formatCoins(row.amount)}</strong>
                </li>
              ))}
              {mineHidden && mine ? (
                <li className={[styles.rank, styles.rankMine].join(' ')}>
                  <strong>{mine.rank}</strong>
                  <span>Tú</span>
                  <strong>{formatCoins(mine.amount)}</strong>
                </li>
              ) : null}
              {rest > (mineHidden ? 1 : 0) ? (
                <li className={styles.rank} style={{ color: 'var(--eci-text-dim)' }}>
                  <span>…</span>
                  <span>{rest - (mineHidden ? 1 : 0)} sobres más</span>
                  <span />
                </li>
              ) : null}
            </ol>

            {mine && !round.wonByMe ? (
              <div className={styles.panel}>
                <p className={styles.label}>Tu resultado</p>
                <p className={styles.heroPrice} style={{ color: 'var(--eci-blue-text)', fontSize: '2rem' }}>
                  {mine.rank}.º lugar
                </p>
                {winner ? (
                  <p className={styles.muted}>
                    Te faltaron <strong style={{ color: 'var(--eci-yellow)' }}>{formatCoins(winner.amount - mine.amount + 1)} ECI</strong> para
                    ganar.
                  </p>
                ) : null}
                <p className={styles.muted} style={{ color: 'var(--eci-cyan)' }}>
                  🔓 Tus {formatCoins(mine.amount)} ECI retenidos vuelven a tu saldo.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        <div className={styles.rouletteActions}>
          <Button onClick={onClose}>Volver a la sala</Button>
          <Link className={buttonClass('secondary')} to={routes.myBids}>
            Ver mis pujas
          </Link>
        </div>
      </div>
    </Dialog>
  );
}

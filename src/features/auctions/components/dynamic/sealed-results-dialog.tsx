import type { CSSProperties } from 'react';
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
import { Icon } from '@/shared/components/ui/icon';

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

  // Podio: segundo, primero, tercero, como en uno de verdad.
  const podium = data ? [data.ranking[1], data.ranking[0], data.ranking[2]].filter(Boolean) : [];
  const listed = shown.slice(3);

  return (
    <Dialog open onClose={onClose} title="Se abrieron los sobres" tone={round.wonByMe ? 'cyan' : 'neutral'} size="lg">
      <div className={styles.resultsBody} style={{ '--mode': 'var(--eci-blue)' } as CSSProperties}>
        <div className={styles.resultsHead}>
          <Pill tone="blue">
            <Icon name="mail" size={13} /> Sobre cerrado · ronda {round.position}
          </Pill>
          <h2 className={styles.rouletteTitle}>
            {round.wonByMe ? '¡Ganaste! Tu sobre fue el más alto' : 'Se abrieron los sobres'}
          </h2>
          <p className={styles.muted}>
            {round.itemName} · {data?.sealedCount ?? '…'} sobres sellados
          </p>
        </div>

        {isPending ? <Loading label="Abriendo los sobres..." /> : null}
        {error ? <ErrorState error={error} /> : null}

        {data ? (
          <>
            <ol className={styles.podium} aria-label="Los tres sobres más altos">
              {podium.map((row) => (
                <li
                  key={row.rank}
                  className={[styles.podiumSpot, row.winner ? styles.podiumWinner : '', row.mine ? styles.podiumMine : ''].join(' ')}
                  style={{ animationDelay: `${(3 - row.rank) * 140}ms` }}
                >
                  <span className={styles.podiumWho}>
                    {row.winner ? <Icon name="trophy" size={18} /> : null}
                    {row.mine ? 'Tú' : `Participante ${row.rank}`}
                  </span>
                  <strong className={styles.podiumAmount}>{formatCoins(row.amount)}</strong>
                  <span className={styles.podiumBlock}>
                    <span>{row.rank}</span>
                    {row.winner ? <Pill tone="green">Gana</Pill> : null}
                  </span>
                </li>
              ))}
            </ol>

            {listed.length || mineHidden || rest > (mineHidden ? 1 : 0) ? (
              <ol className={styles.ranking}>
                {listed.map((row) => (
                  <li key={row.rank} className={[styles.rank, row.mine ? styles.rankMine : ''].join(' ')}>
                    <strong>{row.rank}</strong>
                    <span>{row.mine ? 'Tú' : `Participante ${row.rank}`}</span>
                    <strong>{formatCoins(row.amount)}</strong>
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
            ) : null}

            {mine && !round.wonByMe ? (
              <div className={`${styles.panel} ${styles.modePanel}`}>
                <div className={styles.row}>
                  <div>
                    <p className={styles.label}>Tu resultado</p>
                    <p className={`${styles.heroPrice} ${styles.heroMode}`} style={{ fontSize: '2rem' }}>
                      {mine.rank}.º lugar
                    </p>
                  </div>
                  {winner ? (
                    <p className={styles.muted} style={{ maxWidth: '22ch', textAlign: 'right' }}>
                      Te faltaron{' '}
                      <strong style={{ color: 'var(--eci-yellow)' }}>
                        {formatCoins(winner.amount - mine.amount + 1)} ECI
                      </strong>{' '}
                      para ganar.
                    </p>
                  ) : null}
                </div>
                <p className={`${styles.muted} ${styles.okText}`} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <Icon name="unlock" size={15} /> Tus {formatCoins(mine.amount)} ECI retenidos vuelven a tu saldo.
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

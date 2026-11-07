import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import { Icon } from '@/shared/components/ui/icon';
import { pillClass } from '@/shared/components/ui/pill';
import { Freshness } from '../components/freshness';
import { MedalBadges, MedalChip } from '../components/medal-badges';
import { MEDALS, winsToPodium } from '../domain/medals';
import { modeLook } from '../domain/modes';
import { useLeaderboard } from '../hooks/use-gamification';
import type { LeaderboardEntry, LeaderboardWeek } from '../model/gamification';
import styles from './leaderboard.page.module.css';

const DAY = new Intl.DateTimeFormat('es-CO', { day: 'numeric' });
const DAY_MONTH = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
});

function weekRange(from: string, to: string): string {
  const start = new Date(from);
  const end = new Date(to);
  return start.getMonth() === end.getMonth()
    ? `${DAY.format(start)} – ${DAY_MONTH.format(end)}`
    : `${DAY_MONTH.format(start)} – ${DAY_MONTH.format(end)}`;
}

/** Plata a la izquierda, oro al centro y mas alto, bronce a la derecha. */
const PODIUM = [
  { rank: 2, color: 'var(--eci-silver)', className: styles.second },
  { rank: 1, color: 'var(--eci-yellow)', className: styles.first },
  { rank: 3, color: 'var(--eci-bronze)', className: styles.third },
];

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <ol className={styles.podium} aria-label="Podio">
      {PODIUM.map((place) => {
        const entry = entries.find(
          (candidate) => candidate.rank === place.rank,
        );
        if (!entry) return <li key={place.rank} className={styles.vacant} />;
        return (
          <li
            key={place.rank}
            className={[
              styles.place,
              place.className,
              entry.mine ? styles.placeMine : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--place': place.color } as CSSProperties}
          >
            <span className={styles.placeRank}>Puesto {place.rank}</span>
            <span className={styles.placeAvatar} aria-hidden="true">
              {entry.alias.charAt(0).toUpperCase()}
            </span>
            <span className={styles.placeAlias}>
              {entry.alias}
              {entry.mine ? <span className={styles.me}>Tú</span> : null}
            </span>
            <span className={styles.placeStats}>
              {entry.wins} ganadas · {formatCoins(entry.spent)} EC
            </span>
            {entry.badges.length > 0 ? (
              <span className={styles.placeBadges}>
                {entry.badges.map((id) => (
                  <MedalChip key={id} id={id} />
                ))}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const mode = entry.favoriteMode ? modeLook(entry.favoriteMode) : null;
  return (
    <li
      className={[styles.row, entry.mine ? styles.rowMine : '']
        .filter(Boolean)
        .join(' ')}
      aria-current={entry.mine ? 'true' : undefined}
    >
      <span className={styles.rowRank}>#{entry.rank}</span>
      <span className={styles.rowWho}>
        <span className={styles.rowAvatar} aria-hidden="true">
          {entry.alias.charAt(0).toUpperCase()}
        </span>
        <span className={styles.rowAlias}>{entry.alias}</span>
        {entry.mine ? <span className={styles.me}>Tú</span> : null}
        <MedalBadges medals={entry.badges} />
      </span>
      <span className={styles.rowWins}>
        <span className={styles.cellLabel}>Ganadas </span>
        {entry.wins}
      </span>
      <span className={styles.rowBids}>
        <span className={styles.cellLabel}>Pujas </span>
        {entry.bids}
      </span>
      <span className={styles.rowMode} style={{ color: mode?.color }}>
        {mode?.label ?? '—'}
      </span>
    </li>
  );
}

/**
 * Top de la semana: los diez estudiantes con mas subastas ganadas desde el lunes. Sale del
 * mismo modelo de lectura que el perfil, ya ordenado: la pantalla no calcula el ranking.
 */
export function LeaderboardPage() {
  const [week, setWeek] = useState<LeaderboardWeek>('current');
  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useLeaderboard(week);

  const rest = data?.entries.filter((entry) => entry.rank > 3) ?? [];
  const meOutside =
    data?.me && !data.entries.some((entry) => entry.mine) ? data.me : null;
  const missing =
    data && week === 'current' ? winsToPodium(data.entries, data.me) : null;

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Ranking</span>
          <h1 className={styles.title}>Top de la semana</h1>
          <p className={styles.subtitle}>
            {data ? `${weekRange(data.from, data.to)} · ` : ''}Ordenado por
            subastas ganadas; en empate, gana quien gastó menos ECICoin.
          </p>
        </div>
        <div className={styles.tabs} role="group" aria-label="Semana">
          {(
            [
              ['current', 'Esta semana'],
              ['previous', 'Semana pasada'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={week === value}
              className={pillClass('neutral', {
                interactive: true,
                selected: week === value,
              })}
              onClick={() => setWeek(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {isPending ? <Loading label="Cargando el ranking..." /> : null}
      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {data && data.entries.length === 0 ? (
        <EmptyState
          title={
            week === 'current'
              ? 'El top de esta semana arranca vacío'
              : 'La semana pasada nadie ganó subastas'
          }
          actions={
            <Link className={buttonClass('primary')} to={routes.auctions}>
              Ver subastas abiertas
            </Link>
          }
        >
          Gana una subasta y aparece en el ranking. Se reinicia cada lunes a las
          00:00.
        </EmptyState>
      ) : null}

      {data && data.entries.length > 0 ? (
        <div
          className={[styles.board, isPlaceholderData ? styles.stale : '']
            .filter(Boolean)
            .join(' ')}
          aria-busy={isPlaceholderData}
        >
          <Podium entries={data.entries} />

          {rest.length > 0 || meOutside ? (
            <section
              className={styles.table}
              aria-label="Del puesto 4 en adelante"
            >
              <div className={styles.tableHead} aria-hidden="true">
                <span>Puesto</span>
                <span>Estudiante</span>
                <span>Ganadas</span>
                <span>Pujas</span>
                <span>Favorita</span>
              </div>
              <ol className={styles.rows}>
                {rest.map((entry) => (
                  <Row key={entry.rank} entry={entry} />
                ))}
                {meOutside ? (
                  <>
                    <li className={styles.gap} aria-hidden="true">
                      ···
                    </li>
                    <Row entry={meOutside} />
                  </>
                ) : null}
              </ol>
            </section>
          ) : null}

          {missing !== null ? (
            <section className={styles.nudge}>
              <Icon name="star" size={22} />
              <p>
                Te {missing === 1 ? 'falta' : 'faltan'}{' '}
                <strong>
                  {missing} {missing === 1 ? 'victoria' : 'victorias'}
                </strong>{' '}
                para entrar al podio y desbloquear la medalla{' '}
                <strong>{MEDALS.WEEKLY_PODIUM.name}</strong>.
              </p>
              <Link className={buttonClass('primary')} to={routes.auctions}>
                Ver subastas abiertas
              </Link>
            </section>
          ) : null}

          <Freshness updatedAt={data.updatedAt} compact />
        </div>
      ) : null}
    </div>
  );
}

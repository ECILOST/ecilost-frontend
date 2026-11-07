import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useProfile } from '@/features/auth/hooks/use-profile';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { CoinAmount, formatCoins } from '@/shared/components/ui/coin';
import { Icon, type IconName } from '@/shared/components/ui/icon';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill } from '@/shared/components/ui/pill';
import { Freshness } from '../components/freshness';
import { MedalCard, MedalChip } from '../components/medal-badges';
import { MEDALS, isUnlocked, nextMedal, sortMedals } from '../domain/medals';
import { modeLook } from '../domain/modes';
import { useMyProfile } from '../hooks/use-gamification';
import type { ProfileAuction, StudentProfile } from '../model/gamification';
import styles from './profile.page.module.css';

const DATE = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
});

function Stat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className={styles.stat} style={{ '--tone': tone } as CSSProperties}>
      <Icon name={icon} size={18} />
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
      {hint ? <span className={styles.statHint}>{hint}</span> : null}
    </div>
  );
}

function Stats({ profile }: { profile: StudentProfile }) {
  const rate =
    profile.bids > 0 ? Math.round((profile.wins / profile.bids) * 100) : 0;
  const favorite = profile.favoriteMode ? modeLook(profile.favoriteMode) : null;
  return (
    <section className={styles.stats} aria-label="Estadísticas">
      <Stat
        icon="bolt"
        label="Pujas realizadas"
        value={String(profile.bids)}
        tone="var(--eci-cyan)"
      />
      <Stat
        icon="trophy"
        label="Subastas ganadas"
        value={String(profile.wins)}
        hint={profile.bids > 0 ? `${rate}% de tus pujas` : undefined}
        tone="var(--eci-green)"
      />
      <Stat
        icon="coin"
        label="ECICoin gastado"
        value={formatCoins(profile.spent)}
        hint={
          profile.wins > 0
            ? `${formatCoins(Math.round(profile.spent / profile.wins))} por victoria`
            : undefined
        }
        tone="var(--eci-yellow)"
      />
      <Stat
        icon="flame"
        label="Racha activa"
        value={
          profile.streakWeeks === 1 ? '1 semana' : `${profile.streakWeeks} sem.`
        }
        hint="Ganando al menos 1 por semana"
        tone="var(--eci-orange)"
      />
      <Stat
        icon="star"
        label="Modalidad favorita"
        value={favorite?.label ?? '—'}
        hint={
          favorite && profile.favoriteModeBids > 0
            ? `${profile.favoriteModeBids} de tus ${profile.bids} pujas`
            : undefined
        }
        tone={favorite?.color ?? 'var(--eci-text-dim)'}
      />
    </section>
  );
}

function RecentRow({ auction }: { auction: ProfileAuction }) {
  const mode = modeLook(auction.mode);
  const won = auction.result === 'WON';
  return (
    <li>
      <Link className={styles.recentRow} to={routes.room(auction.roomId)}>
        <ItemArt
          seed={auction.itemId}
          label={auction.itemName}
          src={auction.imageUrl}
          variant="thumb"
          className={styles.thumb}
        />
        <span className={styles.recentText}>
          <span className={styles.recentName}>{auction.itemName}</span>
          <span className={styles.recentMeta}>
            <span style={{ color: mode.color }}>{mode.label}</span> ·{' '}
            {DATE.format(new Date(auction.at))}
          </span>
        </span>
        <CoinAmount value={auction.amount} size="sm" tone="plain" />
        <Pill tone={won ? 'green' : 'neutral'}>
          {won ? 'Ganada' : 'Superada'}
        </Pill>
      </Link>
    </li>
  );
}

/**
 * Mi perfil: lo que el estudiante ha logrado. Todo sale de un solo documento (`GET
 * /profiles/me`), que es justo la ventaja del modelo de lectura: la pantalla no suma pujas
 * de tres servicios, lee un resumen ya hecho.
 */
export function ProfilePage() {
  const { data: profile, isPending, isError, error, refetch } = useMyProfile();
  const { data: account } = useProfile();

  if (isPending) return <Loading label="Cargando tu perfil..." />;
  if (isError)
    return (
      <div className={styles.page}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );

  const medals = sortMedals(profile.medals);
  const unlocked = medals.filter(isUnlocked);
  const next = nextMedal(profile.medals);
  const alias = profile.alias || 'Sin alias todavía';
  const initial = (profile.alias || account?.fullName || 'E')
    .charAt(0)
    .toUpperCase();
  const maxPlayed = Math.max(1, ...profile.modes.map((stat) => stat.played));

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>Mi perfil</span>
          <h1 className={styles.alias}>{alias}</h1>
          <p className={styles.who}>
            {account?.fullName ? `${account.fullName} · ` : ''}Así te ven en el
            top semanal
          </p>
          {unlocked.length > 0 ? (
            <div className={styles.chips}>
              {unlocked.slice(0, 2).map((medal) => (
                <MedalChip key={medal.id} id={medal.id} />
              ))}
              {profile.streakWeeks >= 2 &&
              !unlocked.some((medal) => medal.id === 'STREAK_3') ? (
                <Pill tone="yellow">
                  Racha de {profile.streakWeeks} semanas
                </Pill>
              ) : null}
            </div>
          ) : null}
        </div>
        <Link className={styles.rank} to={routes.leaderboard}>
          <span className={styles.rankLabel}>Top de la semana</span>
          <strong className={styles.rankValue}>
            {profile.weeklyRank ? `#${profile.weeklyRank}` : '—'}
          </strong>
          <span className={styles.rankLink}>
            Ver ranking <Icon name="arrow-right" size={14} />
          </span>
        </Link>
      </section>

      <Stats profile={profile} />

      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <section className={styles.panel} aria-labelledby="medallas">
            <header className={styles.panelHead}>
              <h2 id="medallas">Medallas</h2>
              <span>
                {unlocked.length} de {Object.keys(MEDALS).length} desbloqueadas
              </span>
            </header>
            {medals.length === 0 ? (
              <p className={styles.empty}>
                Gana tu primera subasta para desbloquear tu primera medalla.
              </p>
            ) : (
              <ul className={styles.medals}>
                {medals.map((medal) => (
                  <MedalCard key={medal.id} medal={medal} />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="ultimas">
            <header className={styles.panelHead}>
              <h2 id="ultimas">Últimas subastas</h2>
              <Link to={routes.myBids}>Ver todas</Link>
            </header>
            {profile.recent.length === 0 ? (
              <div className={styles.emptyBlock}>
                <p className={styles.empty}>
                  Todavía no has participado en ninguna subasta.
                </p>
                <Link className={buttonClass('primary')} to={routes.auctions}>
                  Ver subastas
                </Link>
              </div>
            ) : (
              <ul className={styles.recent}>
                {profile.recent.map((auction) => (
                  <RecentRow key={auction.roundId} auction={auction} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className={styles.side}>
          {next ? (
            <section
              className={styles.nextCard}
              style={{ '--medal': MEDALS[next.id].color } as CSSProperties}
              aria-label="Siguiente medalla"
            >
              <span className={styles.nextLabel}>Siguiente</span>
              <strong>{MEDALS[next.id].name}</strong>
              <span className={styles.nextBar}>
                <span
                  style={{ width: `${(next.progress / next.goal) * 100}%` }}
                />
              </span>
              <span className={styles.nextHint}>
                {MEDALS[next.id].description} Llevas {next.progress} de{' '}
                {next.goal}.
              </span>
            </section>
          ) : null}

          <section className={styles.panel} aria-labelledby="modalidades">
            <header className={styles.panelHead}>
              <h2 id="modalidades">Victorias por modalidad</h2>
            </header>
            {profile.modes.length === 0 ? (
              <p className={styles.empty}>Aún no hay rondas jugadas.</p>
            ) : (
              <ul className={styles.modes}>
                {profile.modes.map((stat) => {
                  const look = modeLook(stat.mode);
                  return (
                    <li
                      key={stat.mode}
                      style={{ '--tone': look.color } as CSSProperties}
                    >
                      <span className={styles.modeName}>{look.label}</span>
                      <span className={styles.modeCount}>
                        {stat.won} de {stat.played}
                      </span>
                      <span className={styles.modeTrack} aria-hidden="true">
                        <span
                          className={styles.modePlayed}
                          style={{
                            width: `${(stat.played / maxPlayed) * 100}%`,
                          }}
                        />
                        <span
                          className={styles.modeWon}
                          style={{
                            width: `${(stat.won / maxPlayed) * 100}%`,
                          }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Freshness updatedAt={profile.updatedAt} />
        </aside>
      </div>
    </div>
  );
}

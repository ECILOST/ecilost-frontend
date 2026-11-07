import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Brand } from '@/shared/components/shell/brand';
import { Link } from 'react-router-dom';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { CoinAmount } from '@/shared/components/ui/coin';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill } from '@/shared/components/ui/pill';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { StatBox } from '@/shared/components/ui/stat-box';
import { formatCountdown } from '../../domain/auction-rules';
import { isDynamic, MODE_META } from '../../domain/dynamic-modes';
import { useCountdown } from '../../hooks/use-countdown';
import { useLiveRoom } from '../../hooks/use-live-room';
import { useJoinRoom } from '../../hooks/use-room';
import type { Room } from '../../model/auction';
import styles from './room.module.css';

/**
 * Sala programada: cuenta atras, aforo, orden de los objetos y "Unirme". Solo quien entra
 * antes del inicio puede pujar, y eso se dice arriba, en amarillo, no en la letra pequeña.
 *
 * La cuenta atras solo pinta: la sala la abre el servidor a su hora (HU-18). Quien ya esta
 * inscrito escucha el canal en vivo y pasa a la sala en cuanto llega el inicio; los demas se
 * enteran con la relectura periodica de la sala.
 */
export function WaitingRoomView({ room }: { room: Room }) {
  const join = useJoinRoom(room.id);
  useLiveRoom(room.id, room.isParticipant);
  const remaining = useCountdown(room.startsAt);
  const full = room.admitted >= room.capacity;

  return (
    <>
      <ScreenHeader
        title={`${room.name} · Sala de espera`}
        back={{ to: routes.home, label: 'Volver al inicio' }}
        aside={
          room.isParticipant ? (
            <Pill tone="cyan" dot>
              Ya estás inscrito
            </Pill>
          ) : full ? (
            <Pill tone="pink">Sala completa</Pill>
          ) : (
            <Pill tone="cyan">Inscripción abierta</Pill>
          )
        }
      />

      <div className={styles.page}>
        <div className={`${styles.grid} ${styles.waitGrid}`}>
          <div className={styles.main}>
            {/*
              Logo provisional mientras no haya uno definitivo: el logotipo de la cabecera
              en grande. Antes era un marcador con el texto fijo "Campus universitario".
              Es decorativo; el nombre de la sala va justo debajo.
            */}
            <div className={styles.waitBanner} aria-hidden="true">
              <Brand size="lg" asLink={false} />
            </div>
            <h2 className={styles.waitTitle}>{room.title}</h2>
            <p className={styles.warning}>
              Solo podrás participar si ingresas antes del inicio.
            </p>
            <p className={styles.startsLabel}>La sala comienza en</p>
            <div
              className={styles.countdown}
              role="timer"
              aria-label={`La sala comienza en ${formatCountdown(remaining, true)}`}
            >
              <span className={styles.countdownValue}>
                {formatCountdown(remaining, true)}
              </span>
            </div>
            {room.dynamicModesEnabled ? (
              <div className={styles.dynamicBanner}>
                <span className={styles.dynamicBannerIcon} aria-hidden="true">
                  <Icon name="spin" size={26} />
                </span>
                <div>
                  <strong>Esta sala tiene subastas dinámicas</strong>
                  <p>
                    Antes de cada ronda se gira una ruleta: holandesa, sobre
                    cerrado o lote misterioso. Cada una se juega distinto.
                  </p>
                </div>
                <Link
                  className={buttonClass('secondary')}
                  to={routes.dynamicGuide}
                >
                  Cómo se juega
                </Link>
              </div>
            ) : (
              <Link className={styles.guideLink} to={routes.dynamicGuide}>
                <Icon name="help" size={16} /> ¿Cómo funcionan las subastas
                dinámicas?
              </Link>
            )}
            <div className={styles.waitStats}>
              <StatBox
                size="lg"
                align="center"
                tone="cyan"
                label="Participantes registrados"
                value={`${room.admitted}/${room.capacity}`}
              />
              <StatBox
                size="lg"
                align="center"
                tone="yellow"
                label="Objetos en la sala"
                value={room.rounds.length}
              />
              <StatBox
                size="lg"
                align="center"
                tone="pink"
                label="Capacidad máxima"
                value={room.capacity}
              />
            </div>
          </div>

          <aside className={styles.main}>
            <div className={styles.orderHeader}>
              <h2 className={styles.orderTitle}>Orden de los objetos</h2>
              <span className={styles.count}>
                {room.rounds.length} en total
              </span>
            </div>
            <ol className={styles.order}>
              {room.rounds.map((round) => (
                <li key={round.id} className={styles.orderRow}>
                  <span className={styles.orderNumber}>
                    {String(round.position).padStart(2, '0')}
                  </span>
                  <ItemArt
                    seed={round.itemId}
                    label={round.itemName}
                    src={round.imageUrl}
                    variant="thumb"
                  />
                  <span className={styles.orderName}>
                    {round.itemName}
                    {room.dynamicModesEnabled ? (
                      isDynamic(round.mode) && round.modeLocked ? (
                        <Pill tone={MODE_META[round.mode].tone}>
                          {MODE_META[round.mode].glyph}{' '}
                          {MODE_META[round.mode].label}
                        </Pill>
                      ) : (
                        <Pill tone="neutral">Ruleta antes de empezar</Pill>
                      )
                    ) : null}
                  </span>
                  <CoinAmount value={round.basePrice} size="sm" />
                </li>
              ))}
            </ol>

            {join.isError ? <ErrorState error={join.error} /> : null}

            <Button
              className={styles.join}
              size="block"
              disabled={room.isParticipant || full || join.isPending}
              onClick={() => join.mutate()}
            >
              {room.isParticipant
                ? 'Ya estás dentro · te llevamos al empezar'
                : full
                  ? 'Sala completa'
                  : join.isPending
                    ? 'Uniéndote...'
                    : 'Unirme a la sala'}
            </Button>
            <p className={styles.note}>
              Al unirte podrás pujar en los {room.rounds.length} objetos y
              configurar tu puja automática con límite máximo.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}

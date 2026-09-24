import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Button } from '@/shared/components/ui/button';
import { CoinAmount } from '@/shared/components/ui/coin';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill } from '@/shared/components/ui/pill';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { StatBox } from '@/shared/components/ui/stat-box';
import { formatCountdown } from '../../domain/auction-rules';
import { useCountdown } from '../../hooks/use-countdown';
import { useJoinRoom } from '../../hooks/use-room';
import type { Room } from '../../model/auction';
import styles from './room.module.css';

/**
 * Sala programada: cuenta atras, aforo, orden de los objetos y "Unirme". Solo quien entra
 * antes del inicio puede pujar, y eso se dice arriba, en amarillo, no en la letra pequeña.
 */
export function WaitingRoomView({ room }: { room: Room }) {
  const join = useJoinRoom(room.id);
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
            <ItemArt
              seed={room.id}
              label="Campus universitario"
              variant="plain"
            />
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
                    variant="thumb"
                  />
                  <span className={styles.orderName}>{round.itemName}</span>
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

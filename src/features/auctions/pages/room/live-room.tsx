import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useWallet } from '@/features/wallet/hooks/use-wallet';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { CoinAmount, formatCoins } from '@/shared/components/ui/coin';
import { CountdownRing } from '@/shared/components/ui/countdown-ring';
import { Icon } from '@/shared/components/ui/icon';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill } from '@/shared/components/ui/pill';
import { ScreenHeader } from '@/shared/components/ui/screen-header';
import { Toggle } from '@/shared/components/ui/toggle';
import { AutoBidPanel } from '../../components/auto-bid-panel';
import {
  ConfirmBidDialog,
  InsufficientDialog,
  type BidIntent,
} from '../../components/bid-confirm-dialogs';
import {
  OutcomeDialog,
  OutcomeFigure,
  OutcomeRow,
  OutcomeStrip,
} from '../../components/outcome-dialog';
import {
  NextItem,
  RecentBids,
  RoomActivityList,
  RoomItemsStrip,
} from '../../components/room-panels';
import { CustomBidForm } from '../../components/custom-bid-form';
import {
  LAST_SECONDS_MS,
  formatCountdown,
  roundProgress,
} from '../../domain/auction-rules';
import { useCountdown } from '../../hooks/use-countdown';
import {
  useAutoBid,
  useBuyNow,
  useLiveRoom,
  usePlaceBid,
} from '../../hooks/use-live-room';
import type { LiveRoom, Round } from '../../model/auction';
import styles from './room.module.css';

/** Duracion base de una ronda, para estimar lo que le queda a la sala. */
const ROUND_ESTIMATE_MS = 3 * 60_000;

type OutcomeKind = 'winning' | 'outbid' | 'last' | 'won' | 'limit';

const coins = (value: number) => `${formatCoins(value)} ECICoin`;

/** Plazo para reclamar un objeto ganado, como lo dice el aviso del diseño. */
function claimDeadline(): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/**
 * Sala en curso para quien participa: el objeto en subasta, precio y reloj, pujar, puja
 * automatica, pujas recientes y lo que viene despues.
 *
 * Los estados (vas ganando, te superaron, ultimos segundos, ganaste, limite) se deducen
 * comparando cada estado en vivo con el anterior: el canal empuja cambios, y lo que la
 * persona tiene que saber es que cambio para ella.
 */
export function LiveRoomView({ roomId }: { roomId: string }) {
  const {
    data: live,
    isPending,
    isError,
    error,
    refetch,
  } = useLiveRoom(roomId);
  const placeBid = usePlaceBid(roomId);
  const buyNow = useBuyNow(roomId);
  const autoBid = useAutoBid(roomId);
  const { data: wallet } = useWallet();

  const [intent, setIntent] = useState<BidIntent | null>(null);
  const [insufficient, setInsufficient] = useState<BidIntent | null>(null);
  const [outcome, setOutcome] = useState<{
    kind: OutcomeKind;
    round: Round;
  } | null>(null);
  const [editingLimit, setEditingLimit] = useState(false);

  const round = live?.round ?? null;
  const remaining = useCountdown(round?.endsAt ?? null, live?.serverTime);
  const previous = useRef<LiveRoom | undefined>(undefined);
  const lastSecondsShown = useRef<string | null>(null);
  const outbidShown = useRef<string | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = live;
    if (!live || !before) return;

    const won = live.room.rounds.find(
      (candidate) =>
        candidate.wonByMe &&
        before.room.rounds.find((old) => old.id === candidate.id)?.status ===
          'ACTIVE',
    );
    if (won) {
      setOutcome({ kind: 'won', round: won });
      return;
    }
    if (before.round && live.round && before.round.id === live.round.id) {
      // Con la puja automatica activa, responder es cosa suya: se avisa una vez por ronda
      // y no cada vez que un rival puja.
      const autoResponds = live.autoBid.enabled && !live.autoBid.stopped;
      const alreadyWarned = outbidShown.current === live.round.id;
      if (
        before.round.leading &&
        !live.round.leading &&
        !(autoResponds && alreadyWarned)
      ) {
        outbidShown.current = live.round.id;
        setOutcome({ kind: 'outbid', round: live.round });
        return;
      }
    }
    if (!before.autoBid.stopped && live.autoBid.stopped && live.round) {
      setOutcome({ kind: 'limit', round: live.round });
    }
  }, [live]);

  useEffect(() => {
    if (!round || remaining <= 0 || remaining > LAST_SECONDS_MS) return;
    if (lastSecondsShown.current === round.id) return;
    lastSecondsShown.current = round.id;
    setOutcome({ kind: 'last', round });
  }, [remaining, round]);

  const available = wallet ? Number(wallet.availableBalance) : null;

  function start(kind: BidIntent['kind'], amount: number) {
    setOutcome(null);
    const next = { kind, amount };
    if (available !== null && amount > available) setInsufficient(next);
    else setIntent(next);
  }

  function confirm() {
    if (!intent) return;
    const done = (state: LiveRoom) => {
      setIntent(null);
      if (intent.kind === 'bid' && state.round)
        setOutcome({ kind: 'winning', round: state.round });
    };
    if (intent.kind === 'buy')
      buyNow.mutate(undefined, {
        onSuccess: done,
        onSettled: () => setIntent(null),
      });
    else
      placeBid.mutate(intent.amount, {
        onSuccess: done,
        onSettled: () => setIntent(null),
      });
  }

  const header = (
    <ScreenHeader
      title="Sala de subasta en vivo"
      back={{ to: routes.home, label: 'Volver al inicio' }}
      badges={
        <Pill tone="pink" live>
          En vivo
        </Pill>
      }
      aside={
        live && round ? (
          <>
            <span className={styles.chip}>
              Objeto {round.position} de {live.room.rounds.length}
            </span>
            <span>
              Ronda {round.position} de {live.room.rounds.length} ·{' '}
              {live.participants} participantes ·{' '}
              {formatCountdown(
                remaining +
                  live.room.rounds.filter((r) => r.status === 'SCHEDULED')
                    .length *
                    ROUND_ESTIMATE_MS,
              )}{' '}
              restantes
            </span>
          </>
        ) : null
      }
    />
  );

  if (isPending || isError || !live) {
    return (
      <>
        {header}
        <div className={styles.page}>
          {isPending ? <Loading label="Entrando a la sala..." /> : null}
          {isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : null}
        </div>
      </>
    );
  }

  const nextBid = round ? round.minimumBid : 0;
  const mutationError = placeBid.error ?? buyNow.error ?? autoBid.error;
  /*
   * "Vas ganando" y "ultimos segundos" siguen el precio y el reloj en vivo. Los demas
   * cuentan lo que paso en un momento concreto, asi que muestran la ronda congelada de
   * entonces: si la puja automatica ya respondio, el aviso no se contradice.
   */
  const followsLive =
    outcome && (outcome.kind === 'winning' || outcome.kind === 'last');
  const shownLive =
    followsLive && round && outcome.round.id === round.id
      ? round
      : outcome?.round;

  return (
    <>
      {header}
      <div className={styles.page}>
        {mutationError ? <ErrorState error={mutationError} /> : null}

        <div className={styles.grid}>
          <div className={styles.main}>
            {round ? (
              <>
                <ItemArt
                  seed={round.itemId}
                  label={round.itemName}
                  variant="hero"
                  className={styles.art}
                >
                  <CountdownRing
                    className={styles.ring}
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
                  <div className={styles.mine} aria-live="polite">
                    {round.myHighestBid !== null ? (
                      <span className={styles.myBid}>
                        Tu puja más alta: {formatCoins(round.myHighestBid)}
                      </span>
                    ) : null}
                    {round.leading ? (
                      <span className={`${styles.state} ${styles.winning}`}>
                        Vas ganando
                      </span>
                    ) : round.myHighestBid !== null ? (
                      <span className={`${styles.state} ${styles.outbid}`}>
                        Te superaron
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={styles.actions}>
                  <Button
                    variant="bid"
                    size="block"
                    onClick={() => start('bid', nextBid)}
                  >
                    ⚡ Pujar {formatCoins(nextBid)} ECICoin
                  </Button>
                  {round.buyNowPrice !== null &&
                  round.buyNowPrice > round.currentPrice ? (
                    <Button
                      variant="secondary"
                      size="block"
                      onClick={() => start('buy', round.buyNowPrice ?? 0)}
                    >
                      🛒 Comprar ahora · {formatCoins(round.buyNowPrice)}
                    </Button>
                  ) : null}
                </div>

                <div className={styles.customBid}>
                  <CustomBidForm
                    minimum={nextBid}
                    disabled={placeBid.isPending}
                    onBid={(amount) => start('bid', amount)}
                  />
                </div>
              </>
            ) : (
              <div className={styles.between}>
                <Icon name="timer" size={28} />
                <p>Preparando el siguiente objeto...</p>
              </div>
            )}

            <div className={styles.strip}>
              <RoomItemsStrip room={live.room} />
            </div>
          </div>

          <aside className={styles.side}>
            {round ? (
              <AutoBidPanel
                autoBid={live.autoBid}
                round={round}
                nextBid={nextBid}
                pending={autoBid.isPending}
                onChange={(config) => autoBid.mutate(config)}
                editing={editingLimit}
                onEditingChange={setEditingLimit}
              />
            ) : null}
            <RecentBids bids={live.bids} />
            <RoomActivityList activity={live.activity} />
            <NextItem room={live.room} active={round} />
          </aside>
        </div>
      </div>

      {round ? (
        <>
          <ConfirmBidDialog
            intent={intent}
            onClose={() => setIntent(null)}
            onConfirm={confirm}
            pending={placeBid.isPending || buyNow.isPending}
            itemId={round.itemId}
            itemName={round.itemName}
            myHighestBid={round.myHighestBid}
            available={available}
          />
          <InsufficientDialog
            intent={insufficient}
            onClose={() => setInsufficient(null)}
            itemId={round.itemId}
            itemName={round.itemName}
            available={available ?? 0}
          />
        </>
      ) : null}

      {outcome && shownLive ? (
        <OutcomeScreens
          kind={outcome.kind}
          round={shownLive}
          live={live}
          remaining={remaining}
          onClose={() => setOutcome(null)}
          onBid={(amount) => start('bid', amount)}
          onRaiseLimit={() => {
            setOutcome(null);
            setEditingLimit(true);
          }}
          onToggleAutoBid={(enabled) =>
            autoBid.mutate({
              enabled,
              limit: live.autoBid.limit || nextBid * 2,
            })
          }
        />
      ) : null}
    </>
  );
}

function OutcomeScreens({
  kind,
  round,
  live,
  remaining,
  onClose,
  onBid,
  onRaiseLimit,
  onToggleAutoBid,
}: {
  kind: OutcomeKind;
  round: Round;
  live: LiveRoom;
  remaining: number;
  onClose: () => void;
  onBid: (amount: number) => void;
  onRaiseLimit: () => void;
  onToggleAutoBid: (enabled: boolean) => void;
}) {
  const next = round.minimumBid;
  const common = {
    open: true,
    onClose,
    itemId: round.itemId,
    itemName: round.itemName,
  };
  const myBids = (
    <Link className={buttonClass('secondary', 'lg')} to={routes.myBids}>
      {kind === 'winning' ? 'Ver mis pujas' : 'Ir a mis pujas'}
    </Link>
  );
  const price = (label = 'Precio actual') => (
    <OutcomeFigure label={label} highlight>
      <CoinAmount value={round.currentPrice} size="xl" unit />
    </OutcomeFigure>
  );

  if (kind === 'winning') {
    return (
      <OutcomeDialog
        {...common}
        tone="cyan"
        heading="¡Vas ganando!"
        subtitle={<Pill tone="cyan">Tu oferta es la más alta</Pill>}
        actions={
          <>
            <Button size="lg" onClick={onClose}>
              Volver a la sala
            </Button>
            {myBids}
          </>
        }
      >
        <OutcomeRow>
          <OutcomeFigure label="Tu última puja">
            {coins(round.myHighestBid ?? round.currentPrice)}
          </OutcomeFigure>
          <OutcomeFigure label="Siguiente puja">{coins(next)}</OutcomeFigure>
        </OutcomeRow>
        <OutcomeStrip tone="cyan">
          <Icon name="timer" size={16} />
          <span style={{ flex: 1, color: 'var(--eci-text)' }}>
            Tiempo restante
          </span>
          <span className="u-numeric">{formatCountdown(remaining, true)}</span>
        </OutcomeStrip>
        {price()}
      </OutcomeDialog>
    );
  }

  if (kind === 'outbid') {
    const diff =
      round.currentPrice - (round.myHighestBid ?? round.currentPrice);
    return (
      <OutcomeDialog
        {...common}
        tone="pink"
        heading="¡Te superaron!"
        subtitle={`Alguien pujó ${formatCoins(diff)} ECICoin más que tú.`}
        actions={
          <>
            <Button variant="bid" size="lg" onClick={() => onBid(next)}>
              ⚡ Pujar {formatCoins(next)}
            </Button>
            {myBids}
          </>
        }
      >
        <OutcomeRow>
          <OutcomeFigure label="Tu última oferta">
            {formatCoins(round.myHighestBid ?? 0)}
          </OutcomeFigure>
          <OutcomeFigure label="Siguiente puja">
            {formatCoins(next)}
          </OutcomeFigure>
        </OutcomeRow>
        <OutcomeStrip tone={live.autoBid.enabled ? 'cyan' : 'pink'}>
          <Toggle
            checked={live.autoBid.enabled}
            label="Puja automática"
            onChange={onToggleAutoBid}
          />
          <span>
            {live.autoBid.enabled
              ? `Pujaremos por ti: ${formatCoins(next)}`
              : 'Puja automática desactivada'}
            <br />
            <small style={{ color: 'var(--eci-text-label)', fontWeight: 500 }}>
              {live.autoBid.enabled
                ? `Puja automática activa hasta ${formatCoins(live.autoBid.limit)}`
                : 'Actívala para responder sin estar pendiente'}
            </small>
          </span>
        </OutcomeStrip>
        {price()}
      </OutcomeDialog>
    );
  }

  if (kind === 'last') {
    return (
      <OutcomeDialog
        {...common}
        tone="yellow"
        heading="¡Últimos segundos!"
        subtitle="La subasta está por finalizar. Una puja ahora extiende el reloj 10 segundos."
        actions={
          <>
            <Button variant="bid" size="lg" onClick={() => onBid(next)}>
              ⚡ Pujar {formatCoins(next)}
            </Button>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Ver seguimiento
            </Button>
          </>
        }
      >
        <OutcomeStrip tone="yellow">
          <span
            className="u-numeric"
            style={{
              width: '100%',
              textAlign: 'center',
              fontSize: '3.25rem',
              lineHeight: 1.2,
            }}
          >
            {formatCountdown(remaining, true)}
          </span>
        </OutcomeStrip>
        {price()}
      </OutcomeDialog>
    );
  }

  if (kind === 'won') {
    return (
      <OutcomeDialog
        {...common}
        tone="cyan"
        confetti
        heading="¡Ganaste!"
        subtitle="Ganaste este objeto. La sala continúa con el siguiente."
        actions={
          <>
            <Button size="lg" onClick={onClose}>
              Ver siguiente objeto →
            </Button>
            {myBids}
          </>
        }
      >
        <OutcomeFigure label="Cómo reclamarlo">
          <span
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            Reclámalo en la Oficina de Objetos Perdidos, Biblioteca Central,
            antes del {claimDeadline()}.
          </span>
        </OutcomeFigure>
        {price('Precio final')}
      </OutcomeDialog>
    );
  }

  return (
    <OutcomeDialog
      {...common}
      tone="pink"
      heading="¡Alcanzaste tu límite!"
      subtitle="No haremos más pujas automáticas por este objeto."
      actions={
        <>
          <Button size="lg" onClick={onRaiseLimit}>
            Subir mi límite máximo
          </Button>
          <Button variant="secondary" size="lg" onClick={onClose}>
            Seguir sin pujar
          </Button>
        </>
      }
    >
      <OutcomeRow>
        <OutcomeFigure label="Precio actual">
          {formatCoins(round.currentPrice)}
        </OutcomeFigure>
        <OutcomeFigure label="Tu última oferta">
          {formatCoins(round.myHighestBid ?? 0)}
        </OutcomeFigure>
      </OutcomeRow>
      <OutcomeStrip tone="pink">
        <Toggle
          checked={false}
          tone="pink"
          label="Puja automática"
          onChange={() => onRaiseLimit()}
        />
        Puja automática detenida
      </OutcomeStrip>
      <OutcomeFigure label="Tu límite configurado" highlight>
        <CoinAmount value={live.autoBid.limit} size="xl" unit />
      </OutcomeFigure>
    </OutcomeDialog>
  );
}

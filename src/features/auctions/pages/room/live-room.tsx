import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useWallet } from '@/features/wallet/hooks/use-wallet';
import { serverNow } from '@/shared/api/server-clock';
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
import { DutchPanel } from '../../components/dynamic/dutch-panel';
import { ModeAnnouncement } from '../../components/dynamic/mode-announcement';
import { MysteryClues } from '../../components/dynamic/mystery-clues';
import { RouletteReveal } from '../../components/dynamic/roulette-reveal';
import { SealedPanel } from '../../components/dynamic/sealed-panel';
import { SealedResultsDialog } from '../../components/dynamic/sealed-results-dialog';
import {
  acceptsAscendingBids,
  isDynamic,
  MODE_META,
} from '../../domain/dynamic-modes';
import { useDynamicRoom } from '../../hooks/use-dynamic-room';
import {
  ANTI_SNIPING_WINDOW_MS,
  coinsToCommit,
  formatCountdown,
  roundProgress,
  claimDeadline,
} from '../../domain/auction-rules';
import type { OutcomeKind } from '../../domain/live-room-changes';
import { useCountdown } from '../../hooks/use-countdown';
import { useLiveOutcomes } from '../../hooks/use-live-outcomes';
import {
  useAutoBid,
  useBuyNow,
  useDutchClaim,
  useLiveRoom,
  usePlaceBid,
  useSealBid,
} from '../../hooks/use-live-room';
import type { LiveRoom, Round } from '../../model/auction';
import styles from './room.module.css';

/** Duracion base de una ronda, para estimar lo que le queda a la sala. */
const ROUND_ESTIMATE_MS = 3 * 60_000;

const coins = (value: number) => `${formatCoins(value)} ECICoin`;

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
  const dutchClaim = useDutchClaim(roomId);
  const sealBid = useSealBid(roomId);
  const { data: wallet } = useWallet();

  const [intent, setIntent] = useState<BidIntent | null>(null);
  const [insufficient, setInsufficient] = useState<BidIntent | null>(null);
  const [editingLimit, setEditingLimit] = useState(false);

  const round = live?.round ?? null;
  const remaining = useCountdown(round?.endsAt ?? null);
  const { outcome, setOutcome, extended } = useLiveOutcomes(live, remaining);
  // Subastas dinamicas: la ruleta que gira el dueño y el anuncio de la modalidad.
  const dynamic = useDynamicRoom(live);

  // HU-25: un dialogo abierto es para el objeto que se veia al abrirlo. Si la sala paso a
  // otro (alguien lo compro o vencio), se cierra: confirmarlo ya no tiene a que ir.
  useEffect(() => {
    const shownId = round?.id ?? null;
    if (intent && intent.roundId !== shownId) setIntent(null);
    if (insufficient && insufficient.roundId !== shownId) setInsufficient(null);
  }, [round?.id, intent, insufficient]);

  const available = wallet ? Number(wallet.availableBalance) : null;

  function start(kind: BidIntent['kind'], amount: number) {
    setOutcome(null);
    // Mejorar la propia puja solo reserva la diferencia: compararla entera con el saldo
    // bloqueaba mejoras que si alcanzaban.
    const commit = round ? coinsToCommit(amount, round) : amount;
    const next = { kind, amount, commit, roundId: round?.id ?? null };
    if (available !== null && commit > available) setInsufficient(next);
    else setIntent(next);
  }

  function confirm() {
    if (!intent) return;
    const done = (state: LiveRoom) => {
      setIntent(null);
      if (intent.kind === 'bid' && state.round)
        setOutcome({ kind: 'winning', round: state.round });
    };
    // Sin ronda a la vista no hay a que pujar ni que comprar.
    if (!intent.roundId) return setIntent(null);
    if (intent.kind === 'buy')
      buyNow.mutate(intent.roundId, {
        onSuccess: done,
        onSettled: () => setIntent(null),
      });
    else
      placeBid.mutate(
        { roundId: intent.roundId, amount: intent.amount },
        { onSuccess: done, onSettled: () => setIntent(null) },
      );
  }

  const header = (
    <ScreenHeader
      title="Sala de subasta en vivo"
      back={{ to: routes.home, label: 'Volver al inicio' }}
      badges={
        <>
          {round && isDynamic(round.mode) ? (
            <Pill tone={MODE_META[round.mode].tone}>
              {MODE_META[round.mode].glyph} {MODE_META[round.mode].label}
            </Pill>
          ) : null}
          <Pill tone="pink" live>
            En vivo
          </Pill>
        </>
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
  const mutationError =
    placeBid.error ?? buyNow.error ?? autoBid.error ?? dutchClaim.error ?? sealBid.error;
  const mode = round?.mode ?? 'CLASSIC';
  const hiddenMystery = round?.mode === 'MYSTERY' && round.mystery !== null;
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
                  // Lote misterioso: el objeto esta oculto, el arte solo muestra la incognita.
                  label={hiddenMystery ? '?' : round.itemName}
                  src={hiddenMystery ? null : round.imageUrl}
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
                    {mode === 'DUTCH' ? null : (
                      <>
                        <span className={styles.label}>
                          {mode === 'SEALED' ? 'Precio base' : 'Precio actual'}
                        </span>
                        <CoinAmount value={mode === 'SEALED' ? round.basePrice : round.currentPrice} size="hero" unit />
                      </>
                    )}
                  </div>
                  <div className={styles.mine} aria-live="polite">
                    {round.myHighestBid !== null ? (
                      <span className={styles.myBid}>
                        Tu puja más alta: {formatCoins(round.myHighestBid)}
                      </span>
                    ) : null}
                    {extended ? (
                      <Pill tone="yellow" live>
                        Cierre extendido: {formatCountdown(remaining)}
                      </Pill>
                    ) : remaining > 0 && remaining < ANTI_SNIPING_WINDOW_MS ? (
                      <span className={styles.myBid}>
                        Una puja ahora extiende el cierre hasta 1 minuto
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

                {hiddenMystery && round.mystery ? (
                  <MysteryClues entries={round.mystery.entries} />
                ) : null}

                {mode === 'DUTCH' ? (
                  <DutchPanel
                    round={round}
                    available={available}
                    pending={dutchClaim.isPending}
                    watchers={live.participants}
                    onClaim={() => {
                      setOutcome(null);
                      // Sin confirmacion a proposito: en la holandesa gana quien pulsa primero.
                      dutchClaim.mutate(round.id);
                    }}
                  />
                ) : null}

                {mode === 'SEALED' ? (
                  <SealedPanel
                    round={round}
                    available={available}
                    pending={sealBid.isPending}
                    participants={live.participants}
                    onSeal={(amount) => sealBid.mutate({ roundId: round.id, amount })}
                  />
                ) : null}

                {acceptsAscendingBids(mode) ? (
                  <>
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
                ) : null}
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
            {round && acceptsAscendingBids(round.mode) ? (
              <AutoBidPanel
                autoBid={live.autoBid}
                round={round}
                nextBid={nextBid}
                pending={autoBid.isPending}
                onChange={(config) =>
                  autoBid.mutate({ roundId: round.id, config })
                }
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
            imageUrl={round.imageUrl}
            myHighestBid={round.myHighestBid}
            available={available}
          />
          <InsufficientDialog
            intent={insufficient}
            onClose={() => setInsufficient(null)}
            itemId={round.itemId}
            itemName={round.itemName}
            imageUrl={round.imageUrl}
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
              // La ronda del aviso: si ya cerro, el servicio lo rechaza.
              roundId: shownLive.id,
              config: { enabled, limit: live.autoBid.limit || nextBid * 2 },
            })
          }
        />
      ) : null}

      {dynamic.spin && !dynamic.announcing ? (
        <RouletteReveal
          segment={dynamic.spin.segment}
          position={dynamic.spin.position}
          onClose={dynamic.closeSpin}
        />
      ) : null}

      {dynamic.announcing && isDynamic(dynamic.announcing.mode) ? (
        <ModeAnnouncement
          mode={dynamic.announcing.mode}
          position={dynamic.announcing.position}
          total={live.room.rounds.length}
          onDone={dynamic.closeAnnouncement}
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
    imageUrl: round.imageUrl,
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
        subtitle="La subasta está por finalizar. Una puja ahora extiende el cierre hasta 1 minuto."
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

  if (kind === 'sold') {
    return (
      <OutcomeDialog
        {...common}
        tone="pink"
        heading="Vendido por compra inmediata"
        subtitle="Otro participante compró este objeto. La sala continúa con el siguiente."
        actions={
          <Button size="lg" onClick={onClose}>
            Ver siguiente objeto →
          </Button>
        }
      >
        {round.myHighestBid !== null ? (
          <OutcomeRow>
            <OutcomeFigure label="Tu última oferta">
              {formatCoins(round.myHighestBid)}
            </OutcomeFigure>
            <OutcomeFigure label="Tus ECICoin reservados">
              Se liberan
            </OutcomeFigure>
          </OutcomeRow>
        ) : null}
        {price('Precio de compra')}
      </OutcomeDialog>
    );
  }

  // Subastas dinamicas: la apertura de sobres es el resultado del sobre cerrado.
  if (kind === 'sealed') return <SealedResultsDialog round={round} onClose={onClose} />;

  if (kind === 'lost') {
    return (
      <OutcomeDialog
        {...common}
        itemName="Lote misterioso"
        imageUrl={null}
        tone="pink"
        heading="Esta vez no"
        subtitle="Otro participante se llevó el lote misterioso. El objeto solo se revela a quien ganó."
        actions={
          <>
            <Button size="lg" onClick={onClose}>
              Ver siguiente objeto →
            </Button>
            {myBids}
          </>
        }
      >
        <OutcomeRow>
          <OutcomeFigure label="Tu última puja">
            {formatCoins(round.myHighestBid ?? 0)}
          </OutcomeFigure>
          <OutcomeFigure label="Tus ECICoin reservados">Se liberan</OutcomeFigure>
        </OutcomeRow>
        {price('Precio ganador')}
      </OutcomeDialog>
    );
  }

  if (kind === 'won') {
    const dynamicWin =
      round.mode === 'MYSTERY'
        ? { heading: '¡Ganaste el misterio!', subtitle: `Era… ${round.itemName}. Ya puedes verlo en tus pujas.` }
        : round.mode === 'DUTCH'
          ? { heading: '¡Es tuyo!', subtitle: 'Pulsaste «Lo quiero» antes que los demás.' }
          : null;
    return (
      <OutcomeDialog
        {...common}
        tone="cyan"
        confetti
        heading={dynamicWin?.heading ?? '¡Ganaste!'}
        subtitle={dynamicWin?.subtitle ?? 'Ganaste este objeto. La sala continúa con el siguiente.'}
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
            antes del {claimDeadline(serverNow())}.
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

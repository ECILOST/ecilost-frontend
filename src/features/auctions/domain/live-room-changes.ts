import type { LiveRoom, Round } from '../model/auction';
import { roundSoldToSomeoneElse } from './auction-rules';

/** Los avisos que la sala en vivo le muestra a quien puja. */
export type OutcomeKind =
  | 'winning'
  | 'outbid'
  | 'last'
  | 'won'
  | 'limit'
  | 'sold'
  /** Subastas dinamicas: se abrieron los sobres de una ronda en la que sello. */
  | 'sealed'
  /** Subastas dinamicas: un lote misterioso en el que pujo se lo llevo otro. */
  | 'lost';

export interface Outcome {
  kind: OutcomeKind;
  round: Round;
}

export interface LiveRoomChange {
  /** El anti-sniping movio el cierre de la ronda que se esta viendo. */
  extended: boolean;
  /** El aviso que toca mostrar, si alguno. */
  outcome: Outcome | null;
}

/**
 * Que cambio para quien puja entre dos estados en vivo de la sala.
 *
 * El canal empuja estados completos, no eventos: lo que la persona tiene que saber (gano,
 * la superaron, se vendio, se agoto su limite) se deduce comparando el anterior con el
 * nuevo. Es una funcion pura para poder probar cada caso sin montar la pantalla.
 *
 * `outbidWarnedRound` es la ronda en la que ya se aviso que la superaron: con la puja
 * automatica activa, responder es cosa suya, y se avisa una vez por ronda y no cada vez que
 * un rival puja.
 */
export function detectLiveRoomChange(
  before: LiveRoom,
  live: LiveRoom,
  outbidWarnedRound: string | null,
): LiveRoomChange {
  const extended = Boolean(
    before.round?.endsAt &&
    live.round?.endsAt &&
    before.round.id === live.round.id &&
    new Date(live.round.endsAt) > new Date(before.round.endsAt),
  );

  // Subastas dinamicas. El sobre cerrado se abre para todos los que sellaron, ganaran o no:
  // el ranking es el resultado. Va antes que "ganaste", que en esa modalidad ya lo dice el ranking.
  const closedNow = live.room.rounds.find(
    (candidate) =>
      candidate.status === 'CLOSED' &&
      before.room.rounds.find((old) => old.id === candidate.id)?.status === 'ACTIVE',
  );
  if (closedNow?.mode === 'SEALED' && closedNow.sealed?.mine != null) {
    return { extended, outcome: { kind: 'sealed', round: closedNow } };
  }
  if (closedNow?.mode === 'MYSTERY' && !closedNow.wonByMe && closedNow.myHighestBid !== null) {
    return { extended, outcome: { kind: 'lost', round: closedNow } };
  }

  const won = live.room.rounds.find(
    (candidate) =>
      candidate.wonByMe &&
      before.room.rounds.find((old) => old.id === candidate.id)?.status ===
        'ACTIVE',
  );
  if (won) return { extended, outcome: { kind: 'won', round: won } };

  // HU-25: otro participante compro lo que se estaba viendo; se dice, no solo se salta.
  const sold = roundSoldToSomeoneElse(before.round, live.room.rounds);
  if (sold) return { extended, outcome: { kind: 'sold', round: sold } };

  if (before.round && live.round && before.round.id === live.round.id) {
    const autoResponds = live.autoBid.enabled && !live.autoBid.stopped;
    const alreadyWarned = outbidWarnedRound === live.round.id;
    if (
      before.round.leading &&
      !live.round.leading &&
      !(autoResponds && alreadyWarned)
    ) {
      return { extended, outcome: { kind: 'outbid', round: live.round } };
    }
  }

  if (!before.autoBid.stopped && live.autoBid.stopped && live.round) {
    return { extended, outcome: { kind: 'limit', round: live.round } };
  }

  return { extended, outcome: null };
}

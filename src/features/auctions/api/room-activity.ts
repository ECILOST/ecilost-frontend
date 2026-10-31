import type { Bid, Room, RoomActivity } from '../model/auction';

/**
 * Una entrada de `GET /rooms/:roomId/activity` de engagement, tal como viaja. Nunca dice
 * quien: ni quien pujo ni quien gano. Los importes van como texto, igual que en auction.
 */
export type RoomActivityWire =
  | {
      id: string;
      kind: 'BID';
      roundId: string;
      position: number;
      amount: string;
      automatic: boolean;
      extended: boolean;
      endsAt: string;
      at: string;
    }
  | {
      id: string;
      kind: 'ROUND_STARTED';
      roundId: string;
      position: number;
      startingPrice: string;
      mode: string;
      at: string;
    }
  | {
      id: string;
      kind: 'ROUND_CLOSED';
      roundId: string;
      position: number;
      result: 'AWARDED' | 'DESERTED';
      amount: string;
      roomClosed: boolean;
      at: string;
    };

/** Cuantas pujas muestra "Pujas recientes" y cuantas entradas la actividad. */
export const RECENT_BIDS = 5;
export const RECENT_ACTIVITY = 8;

const coins = (amount: string | number) =>
  `${Number(amount).toLocaleString('es-CO')} ECICoin`;

/**
 * Lo que la sala muestra de la actividad publica: las pujas de la ronda vigente y lo que
 * paso en la sala, lo mas reciente primero. La puja propia se reconoce por el monto: en una
 * subasta ascendente cada puja aceptada supera a la anterior, asi que no hay dos iguales.
 */
export function toRoomActivity(
  items: RoomActivityWire[],
  room: Room,
): { bids: Bid[]; activity: RoomActivity[] } {
  const newest = [...items].sort(
    (a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id),
  );
  const nameOf = (roundId: string, position: number) =>
    room.rounds.find((round) => round.id === roundId)?.itemName ??
    `Objeto ${position}`;
  const active = room.rounds.find((round) => round.status === 'ACTIVE');

  const bids: Bid[] = newest
    .filter(
      (item): item is Extract<RoomActivityWire, { kind: 'BID' }> =>
        item.kind === 'BID' && item.roundId === active?.id,
    )
    .slice(0, RECENT_BIDS)
    .map((item) => {
      const amount = Number(item.amount);
      const mine = active?.myHighestBid === amount;
      return {
        id: item.id,
        alias: mine
          ? 'Tú'
          : item.automatic
            ? 'Puja automática'
            : 'Postor anónimo',
        amount,
        at: item.at,
        mine,
      };
    });

  const activity: RoomActivity[] = newest
    .slice(0, RECENT_ACTIVITY)
    .map((item): RoomActivity => {
      const name = nameOf(item.roundId, item.position);
      if (item.kind === 'BID') {
        const text = `Nueva puja de ${coins(item.amount)} por ${name}${
          item.automatic ? ' (automática)' : ''
        }${item.extended ? ' · el cierre se extendió' : ''}`;
        return { id: item.id, kind: 'BID', text, at: item.at };
      }
      if (item.kind === 'ROUND_STARTED') {
        const text =
          item.position === 1
            ? `Empezó la subasta con ${name}, desde ${coins(item.startingPrice)}`
            : `Empezó la ronda de ${name}, desde ${coins(item.startingPrice)}`;
        return { id: item.id, kind: 'STARTED', text, at: item.at };
      }
      const end = item.roomClosed ? ' · la sala terminó' : '';
      return item.result === 'AWARDED'
        ? {
            id: item.id,
            kind: 'AWARDED',
            text: `${name} se vendió por ${coins(item.amount)}${end}`,
            at: item.at,
          }
        : {
            id: item.id,
            kind: 'DESERTED',
            text: `${name} quedó desierto${end}`,
            at: item.at,
          };
    });

  return { bids, activity };
}

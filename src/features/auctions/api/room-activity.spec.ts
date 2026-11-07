import { describe, expect, it } from 'vitest';
import type { Room, Round } from '../model/auction';
import { publicTotals } from '../domain/room-results';
import {
  RECENT_BIDS,
  type RoomActivityWire,
  toRoomActivity,
} from './room-activity';

const at = (second: number) =>
  new Date(Date.UTC(2030, 0, 1, 10, 0, second)).toISOString();

const round = (overrides: Partial<Round>): Round =>
  ({
    id: 'round-1',
    position: 1,
    itemName: 'Mochila negra',
    status: 'ACTIVE',
    myHighestBid: null,
    ...overrides,
  }) as Round;

const room = (rounds: Round[]): Room =>
  ({ id: 'room-1', rounds }) as unknown as Room;

const bid = (
  id: string,
  amount: string,
  second: number,
  extra: Partial<RoomActivityWire> = {},
): RoomActivityWire =>
  ({
    id,
    kind: 'BID',
    roundId: 'round-1',
    position: 1,
    amount,
    automatic: false,
    extended: false,
    endsAt: at(second + 60),
    at: at(second),
    ...extra,
  }) as RoomActivityWire;

describe('toRoomActivity', () => {
  it('las pujas recientes son las de la ronda vigente, sin autor y la mas nueva primero', () => {
    const items = [
      bid('b1', '100', 1),
      bid('b2', '110', 2, { automatic: true }),
      bid('old', '50', 0, { roundId: 'round-0' }),
    ];
    const { bids } = toRoomActivity(items, room([round({})]));
    expect(bids).toEqual([
      {
        id: 'b2',
        alias: 'Puja automática',
        amount: 110,
        at: at(2),
        mine: false,
      },
      {
        id: 'b1',
        alias: 'Postor anónimo',
        amount: 100,
        at: at(1),
        mine: false,
      },
    ]);
  });

  it('reconoce la puja propia por el monto', () => {
    const { bids } = toRoomActivity(
      [bid('b1', '100', 1), bid('b2', '110', 2)],
      room([round({ myHighestBid: 100 })]),
    );
    expect(bids.find((entry) => entry.id === 'b1')).toMatchObject({
      alias: 'Tú',
      mine: true,
    });
    expect(bids.find((entry) => entry.id === 'b2')).toMatchObject({
      mine: false,
    });
  });

  it(`muestra a lo sumo ${RECENT_BIDS} pujas`, () => {
    const many = Array.from({ length: RECENT_BIDS + 3 }, (_, index) =>
      bid(`b${index}`, String(100 + index), index),
    );
    expect(toRoomActivity(many, room([round({})])).bids).toHaveLength(
      RECENT_BIDS,
    );
  });

  it('cuenta lo que paso en la sala con el nombre del objeto', () => {
    const items: RoomActivityWire[] = [
      {
        id: 's1',
        kind: 'ROUND_STARTED',
        roundId: 'round-1',
        position: 1,
        startingPrice: '100',
        mode: 'CLASSIC',
        at: at(0),
      },
      bid('b1', '120', 1, { extended: true }),
      {
        id: 'c1',
        kind: 'ROUND_CLOSED',
        roundId: 'round-1',
        position: 1,
        result: 'AWARDED',
        amount: '120',
        roomClosed: false,
        at: at(2),
      },
      {
        id: 'c2',
        kind: 'ROUND_CLOSED',
        roundId: 'round-2',
        position: 2,
        result: 'DESERTED',
        amount: '80',
        roomClosed: true,
        at: at(3),
      },
    ];
    const { activity } = toRoomActivity(
      items,
      room([
        round({ status: 'CLOSED' }),
        round({
          id: 'round-2',
          position: 2,
          itemName: 'Reloj',
          status: 'CLOSED',
        }),
      ]),
    );
    expect(activity.map((entry) => [entry.kind, entry.text])).toEqual([
      ['DESERTED', 'Reloj quedó desierto · la sala terminó'],
      ['AWARDED', 'Mochila negra se vendió por 120 ECICoin'],
      [
        'BID',
        'Nueva puja de 120 ECICoin por Mochila negra · el cierre se extendió',
      ],
      ['STARTED', 'Empezó la subasta con Mochila negra, desde 100 ECICoin'],
    ]);
  });

  it('un objeto que no conoce la sala se nombra por su posicion', () => {
    const { activity } = toRoomActivity(
      [bid('b1', '100', 1, { roundId: 'otra', position: 3 })],
      room([]),
    );
    expect(activity[0].text).toContain('Objeto 3');
  });
});

describe('publicTotals', () => {
  it('cuenta vendidos y desiertos y suma solo lo vendido', () => {
    expect(
      publicTotals([
        { result: 'AWARDED', finalPrice: 120 },
        { result: 'DESERTED', finalPrice: 80 },
        { result: 'AWARDED', finalPrice: 30 },
        { result: null, finalPrice: 10 },
      ]),
    ).toEqual({ sold: 2, deserted: 1, totalRaised: 150 });
  });
});

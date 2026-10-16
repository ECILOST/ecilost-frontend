import { describe, expect, it } from 'vitest';
import type { LiveRoom, Round } from '../model/auction';
import { detectLiveRoomChange } from './live-room-changes';

const round = (overrides: Partial<Round> = {}): Round => ({
  id: 'r1',
  position: 1,
  itemId: 'item-1',
  itemName: 'Portatil',
  imageUrl: null,
  status: 'ACTIVE',
  basePrice: 1000,
  currentPrice: 1000,
  minimumBid: 1100,
  currentBidderId: null,
  startedAt: '2026-10-15T15:00:00.000Z',
  endsAt: '2026-10-15T15:05:00.000Z',
  maximumEndsAt: null,
  buyNowPrice: null,
  leading: false,
  myHighestBid: null,
  wonByMe: false,
  closeReason: null,
  ...overrides,
});

const live = (
  shown: Round | null,
  rounds: Round[] = shown ? [shown] : [],
  autoBid: Partial<LiveRoom['autoBid']> = {},
): LiveRoom => ({
  room: {
    id: 'room-1',
    name: 'Sala 1',
    title: 'Sala 1',
    status: 'ACTIVE',
    startsAt: '2026-10-15T15:00:00.000Z',
    capacity: 10,
    admitted: 3,
    isParticipant: true,
    rounds,
  },
  round: shown,
  bids: [],
  activity: [],
  autoBid: {
    enabled: false,
    limit: 0,
    stopped: false,
    stoppedReason: null,
    ...autoBid,
  },
  participants: 3,
  serverTime: '2026-10-15T15:01:00.000Z',
});

describe('detectLiveRoomChange', () => {
  it('avisa que ganaste cuando la ronda que estaba activa cierra a tu favor', () => {
    const closed = round({ status: 'CLOSED', wonByMe: true });
    const change = detectLiveRoomChange(
      live(round()),
      live(null, [closed]),
      null,
    );
    expect(change.outcome).toEqual({ kind: 'won', round: closed });
  });

  it('avisa que te superaron al perder el liderato', () => {
    const change = detectLiveRoomChange(
      live(round({ leading: true })),
      live(round()),
      null,
    );
    expect(change.outcome?.kind).toBe('outbid');
  });

  it('con puja automatica activa avisa una sola vez por ronda', () => {
    const before = live(round({ leading: true }), undefined, { enabled: true });
    const after = live(round(), undefined, { enabled: true });
    expect(detectLiveRoomChange(before, after, null).outcome?.kind).toBe(
      'outbid',
    );
    expect(detectLiveRoomChange(before, after, 'r1').outcome).toBeNull();
  });

  it('avisa cuando otro compro de inmediato lo que se estaba viendo', () => {
    const sold = round({ status: 'CLOSED', closeReason: 'BUY_NOW' });
    expect(
      detectLiveRoomChange(live(round()), live(null, [sold]), null).outcome,
    ).toEqual({ kind: 'sold', round: sold });
  });

  it('detecta la extension anti-sniping de la misma ronda', () => {
    const later = round({ endsAt: '2026-10-15T15:06:00.000Z' });
    const change = detectLiveRoomChange(live(round()), live(later), null);
    expect(change.extended).toBe(true);
    expect(change.outcome).toBeNull();
  });

  it('avisa cuando la puja automatica alcanza su limite', () => {
    const change = detectLiveRoomChange(
      live(round(), undefined, { enabled: true }),
      live(round(), undefined, { enabled: true, stopped: true }),
      null,
    );
    expect(change.outcome?.kind).toBe('limit');
  });
});

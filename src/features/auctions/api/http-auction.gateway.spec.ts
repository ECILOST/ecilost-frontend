import { describe, expect, it, vi } from 'vitest';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import type { RoomDetail, RoundDetail } from '@/features/rooms/model/room';
import type { HttpClient } from '@/shared/api/http-client';
import { ApiError } from '@/shared/api/problem-details';
import { createHttpAuctionGateway } from './http-auction.gateway';
import type { RealtimeChannel, RoomEvent } from './realtime-channel';

const round = (overrides: Partial<RoundDetail> = {}): RoundDetail => ({
  id: 'round-1',
  position: 1,
  status: 'SCHEDULED',
  startingPrice: '50000.00',
  currentPrice: '50000.00',
  hasBids: false,
  isLeading: false,
  myHighestBid: null,
  result: null,
  closedAt: null,
  startedAt: null,
  endsAt: null,
  maximumEndsAt: null,
  entries: [{ kind: 'ITEM', catalogId: 'item-1' }],
  ...overrides,
});

const room = (overrides: Partial<RoomDetail> = {}): RoomDetail => ({
  id: 'room-1',
  name: 'Subasta de octubre',
  status: 'SCHEDULED',
  startsAt: '2030-10-01T21:00:00.000Z',
  maximumCapacity: 20,
  admittedCount: 3,
  createdAt: '2026-09-25T10:00:00.000Z',
  isParticipant: false,
  rounds: [
    round(),
    round({
      id: 'round-2',
      position: 2,
      entries: [{ kind: 'LOT', catalogId: 'lot-1' }],
    }),
  ],
  ...overrides,
});

const SERVER_TIME = '2030-10-01T21:01:00.000Z';

function setup(detail: RoomDetail = room()) {
  const http = {
    baseUrl: '/api/auction',
    get: vi.fn((path: string) =>
      Promise.resolve(
        path === '/rooms'
          ? [{ id: detail.id }]
          : path.endsWith('/state')
            ? { serverTime: SERVER_TIME }
            : detail,
      ),
    ),
    post: vi.fn(() => Promise.resolve({ alreadyAdmitted: false })),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient & { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
  const items = {
    findById: vi.fn(() =>
      Promise.resolve({
        id: 'item-1',
        name: 'Portatil Lenovo',
        description: 'Carcasa negra',
        category: 'Electrónica',
        condition: 'GOOD',
        photos: [{ url: 'https://blob/item-1.png' }],
        video: null,
      }),
    ),
  } as unknown as ItemGateway;
  const lots = {
    findById: vi.fn(() =>
      Promise.resolve({
        id: 'lot-1',
        name: 'Kit de oficina',
        items: [
          { id: 'a', name: 'Grapadora' },
          { id: 'b', name: 'Calculadora' },
        ],
      }),
    ),
  } as unknown as LotGateway;

  return { http, items, lots, gateway: createHttpAuctionGateway({ http, items, lots }) };
}

describe('createHttpAuctionGateway', () => {
  it('convierte cada ronda en un objeto subastable con los datos de catalog', async () => {
    const { gateway } = setup();

    const [first, second] = await gateway.items();

    expect(first).toMatchObject({
      id: 'room-1.round-1',
      name: 'Portatil Lenovo',
      category: 'Electrónica',
      condition: 'Bueno',
      imageUrl: 'https://blob/item-1.png',
      roomId: 'room-1',
      roomName: 'Subasta de octubre',
      position: 1,
      roomSize: 2,
      status: 'UPCOMING',
      currentPrice: 50000,
      // Sin pujas todavia, la primera debe alcanzar el precio minimo.
      nextBid: 50000,
    });
    expect(second).toMatchObject({ name: 'Kit de oficina', category: 'Lote', imageUrl: null });
  });

  it('con pujas, la siguiente minima es el precio vigente mas 100', async () => {
    const { gateway } = setup(
      room({
        status: 'ACTIVE',
        rounds: [round({ status: 'ACTIVE', currentPrice: '73250.00', hasBids: true })],
      }),
    );

    const [live] = await gateway.items();

    expect(live).toMatchObject({ status: 'LIVE', currentPrice: 73250, nextBid: 73350 });
  });

  it('encuentra un objeto por su id compuesto con una sola consulta de sala', async () => {
    const { gateway, http } = setup();

    const item = await gateway.item('room-1.round-2');

    expect(item.name).toBe('Kit de oficina');
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/rooms/room-1');
  });

  it('arma la sala con sus rondas en orden y el precio minimo de cada una', async () => {
    const { gateway } = setup(room({ isParticipant: true }));

    const result = await gateway.room('room-1');

    expect(result).toMatchObject({
      id: 'room-1',
      name: 'Subasta de octubre',
      status: 'SCHEDULED',
      capacity: 20,
      admitted: 3,
      isParticipant: true,
    });
    expect(result.rounds.map((r) => [r.position, r.itemName, r.basePrice])).toEqual([
      [1, 'Portatil Lenovo', 50000],
      [2, 'Kit de oficina', 50000],
    ]);
  });

  it('registrarse pide el cupo y devuelve la sala actualizada', async () => {
    const { gateway, http } = setup(room({ isParticipant: true, admittedCount: 4 }));

    const result = await gateway.joinRoom('room-1');

    expect(http.post).toHaveBeenCalledWith('/rooms/room-1/participants');
    expect(result).toMatchObject({ isParticipant: true, admitted: 4 });
  });

  it('si catalog no responde, la sala se sigue viendo', async () => {
    const { gateway, items } = setup();
    vi.mocked(items.findById).mockRejectedValue(new Error('catalog caido'));

    const [first] = await gateway.items();

    expect(first.name).toBe('Objeto del catálogo');
  });

  describe('sala en vivo', () => {
    const activeRoom = (isParticipant: boolean) =>
      room({
        status: 'ACTIVE',
        isParticipant,
        rounds: [
          round({ status: 'CLOSED', hasBids: true }),
          round({
            id: 'round-2',
            position: 2,
            status: 'ACTIVE',
            currentPrice: '60000.00',
            hasBids: true,
            isLeading: true,
            myHighestBid: '60000.00',
            endsAt: '2030-10-01T21:04:00.000Z',
          }),
        ],
      });

    it('toma la ronda activa y la hora del servidor para quien participa', async () => {
      const { gateway, http } = setup(activeRoom(true));

      const live = await gateway.liveRoom('room-1');

      expect(http.get).toHaveBeenCalledWith('/rooms/room-1/state');
      expect(live.serverTime).toBe(SERVER_TIME);
      expect(live.round).toMatchObject({
        id: 'round-2',
        currentPrice: 60000,
        leading: true,
        myHighestBid: 60000,
        minimumBid: 60100,
      });
      expect(live.participants).toBe(3);
    });

    it('quien solo sigue la sala no pide el estado, que es solo para participantes', async () => {
      const { gateway, http } = setup(activeRoom(false));

      await gateway.liveRoom('room-1');

      expect(http.get).not.toHaveBeenCalledWith('/rooms/room-1/state');
    });

    it('puja sobre la ronda activa con el monto exacto y devuelve la sala al dia', async () => {
      const { gateway, http } = setup(activeRoom(true));

      const live = await gateway.placeBid('room-1', 73250);

      expect(http.post).toHaveBeenCalledWith('/rounds/round-2/bids', { amount: 73250 });
      expect(live.round?.id).toBe('round-2');
    });

    it('sin ronda en curso no envia la puja', async () => {
      const { gateway, http } = setup();

      await expect(gateway.placeBid('room-1', 50000)).rejects.toSatisfy(
        (error: unknown) => error instanceof ApiError && error.status === 409,
      );
      expect(http.post).not.toHaveBeenCalled();
    });

    it('mientras no hay canal en vivo, consulta la sala cada dos segundos hasta dejar de escuchar', async () => {
      vi.useFakeTimers();
      try {
        const { gateway } = setup(activeRoom(true));
        const listener = vi.fn();

        const stop = gateway.subscribe('room-1', listener);
        await vi.advanceTimersByTimeAsync(2_000);
        expect(listener).toHaveBeenCalledTimes(1);

        stop();
        await vi.advanceTimersByTimeAsync(10_000);
        expect(listener).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('canal en vivo', () => {
    function withChannel() {
      let emit: (event: RoomEvent) => void = () => undefined;
      const leave = vi.fn();
      const realtime: RealtimeChannel = {
        joinRoom: vi.fn((_roomId, listener) => {
          emit = listener;
          return leave;
        }),
      };
      const base = setup(room({ status: 'ACTIVE', isParticipant: true, rounds: [round({ status: 'ACTIVE' })] }));
      const gateway = createHttpAuctionGateway({ http: base.http, items: base.items, lots: base.lots, realtime });
      const detailReads = () => base.http.get.mock.calls.filter(([path]) => path === '/rooms/room-1').length;
      return { gateway, emit: (event: RoomEvent) => emit(event), leave, detailReads, http: base.http };
    }

    it('cada evento de la sala dispara una relectura del estado del servidor', async () => {
      const { gateway, emit, detailReads } = withChannel();
      const listener = vi.fn();
      gateway.subscribe('room-1', listener);

      emit({ name: 'round.price', roundId: 'round-1', sequence: 1 });
      await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
      expect(detailReads()).toBe(1);
    });

    it('una rafaga de eventos durante una lectura se funde en una sola lectura mas', async () => {
      const { gateway, emit, detailReads, http } = withChannel();
      let release: () => void = () => undefined;
      const original = http.get.getMockImplementation() as (path: string) => Promise<unknown>;
      http.get.mockImplementationOnce((path: string) => new Promise((resolve) => { release = () => resolve(original(path)); }));
      const listener = vi.fn();
      gateway.subscribe('room-1', listener);

      emit({ name: 'round.price', roundId: 'round-1', sequence: 1 });
      emit({ name: 'round.price', roundId: 'round-1', sequence: 2 });
      emit({ name: 'round.price', roundId: 'round-1', sequence: 3 });
      emit({ name: 'bid.outbid', roundId: 'round-1' });
      release();

      await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(2));
      // Cuatro eventos, dos lecturas: la que estaba en vuelo y una que los cubre a todos.
      expect(detailReads()).toBe(2);
    });

    it('descarta un precio que llego tarde: la sala nunca retrocede', async () => {
      const { gateway, emit, detailReads } = withChannel();
      const listener = vi.fn();
      gateway.subscribe('room-1', listener);

      emit({ name: 'round.price', roundId: 'round-1', sequence: 5 });
      await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
      emit({ name: 'round.price', roundId: 'round-1', sequence: 4 });
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(detailReads()).toBe(1);
    });

    it('dejar de escuchar suelta la sala del canal', () => {
      const { gateway, leave } = withChannel();
      gateway.subscribe('room-1', vi.fn())();
      expect(leave).toHaveBeenCalledOnce();
    });
  });

  it('la bandeja viene de engagement, con sus avisos traducidos', async () => {
    const base = setup();
    const engagement = {
      get: vi.fn().mockResolvedValue({
        items: [
          { id: 'n2', kind: 'ROUND_WON', roomId: 'room-1', payload: { position: 1, currentPrice: '200.00' }, createdAt: '2030-10-01T21:05:00.000Z', readAt: null },
          { id: 'n1', kind: 'OUTBID', roomId: 'room-1', payload: { position: 1, currentPrice: '150.00' }, createdAt: '2030-10-01T21:04:00.000Z', readAt: '2030-10-01T21:04:30.000Z' },
        ],
      }),
      post: vi.fn().mockResolvedValue(undefined),
    } as unknown as HttpClient & { post: ReturnType<typeof vi.fn> };
    const gateway = createHttpAuctionGateway({ http: base.http, items: base.items, lots: base.lots, engagement });

    const inbox = await gateway.notifications();
    expect(inbox.map((n) => [n.kind, n.read])).toEqual([['WON', false], ['OUTBID', true]]);
    expect(inbox[0].body).toContain('200');

    await gateway.markNotificationsRead();
    expect(engagement.post).toHaveBeenCalledWith('/notifications/read');
  });

  it('el resumen dice que se gano, que se perdio y que quedo desierto, con lo gastado', async () => {
    const { gateway } = setup(
      room({
        status: 'CLOSED',
        rounds: [
          round({ status: 'CLOSED', result: 'AWARDED', isLeading: true, hasBids: true, currentPrice: '200.00', myHighestBid: '200.00', closedAt: '2030-10-01T21:03:00.000Z' }),
          round({ id: 'round-2', position: 2, status: 'CLOSED', result: 'AWARDED', hasBids: true, currentPrice: '900.00', myHighestBid: '500.00', closedAt: '2030-10-01T21:06:00.000Z', entries: [{ kind: 'LOT', catalogId: 'lot-1' }] }),
          round({ id: 'round-3', position: 3, status: 'CLOSED', result: 'DESERTED', closedAt: '2030-10-01T21:09:00.000Z' }),
        ],
      }),
    );

    const summary = await gateway.roomSummary('room-1');

    expect(summary.rows.map((row) => [row.outcome, row.amount])).toEqual([
      ['WON', 200],
      ['LOST', 500],
      ['NO_BID', null],
    ]);
    expect(summary.rows[2].detail).toMatch(/desierta/);
    expect(summary.totalSpent).toBe(200);
    expect(summary.closedAt).toBe('2030-10-01T21:09:00.000Z');
  });

  it('lo que el servicio aun no ofrece falla con 501 explicito en vez de inventar datos', async () => {
    const { gateway } = setup();

    await expect(gateway.buyNow('room-1')).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.status === 501,
    );
    await expect(gateway.myBids()).resolves.toEqual([]);
  });
});

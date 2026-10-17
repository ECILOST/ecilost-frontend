import { describe, expect, it, vi } from 'vitest';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import type { AutoBidDetail, RoomDetail, RoundDetail } from '@/features/rooms/model/room';
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

function setup(detail: RoomDetail = room(), state: { autoBid: AutoBidDetail | null } = { autoBid: null }) {
  const http = {
    baseUrl: '/api/auction',
    get: vi.fn((path: string) =>
      Promise.resolve(
        path === '/rooms'
          ? [{ id: detail.id }]
          : path.endsWith('/state')
            ? { serverTime: SERVER_TIME, autoBid: state.autoBid }
            : detail,
      ),
    ),
    post: vi.fn(() => Promise.resolve({ alreadyAdmitted: false })),
    patch: vi.fn(),
    put: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(),
  } as unknown as HttpClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
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

  it('un lote con fotografias se ve en la subasta con su portada', async () => {
    const { gateway, lots } = setup();
    vi.mocked(lots.findById).mockResolvedValue({
      id: 'lot-1',
      name: 'Kit de oficina',
      items: [{ id: 'a', name: 'Grapadora' }],
      coverUrl: 'https://blob/lots/lot-1/portada.jpg',
    } as never);

    const [, lotItem] = await gateway.items();

    expect(lotItem).toMatchObject({ category: 'Lote', imageUrl: 'https://blob/lots/lot-1/portada.jpg' });
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

  it('cada ronda trae la primera foto del objeto para pintarla en la sala', async () => {
    const { gateway } = setup(room({ isParticipant: true }));

    const result = await gateway.room('room-1');

    expect(result.rounds.map((r) => r.imageUrl)).toEqual([
      'https://blob/item-1.png',
      // Los lotes no tienen foto propia.
      null,
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

    it('puja sobre la ronda vista con el monto exacto y devuelve la sala al dia', async () => {
      const { gateway, http } = setup(activeRoom(true));

      const live = await gateway.placeBid('room-1', 'round-2', 73250);

      expect(http.post).toHaveBeenCalledWith('/rounds/round-2/bids', { amount: 73250 });
      expect(live.round?.id).toBe('round-2');
    });

    it('compra de inmediato la ronda que se estaba viendo, sin enviar precio, y devuelve la sala al dia (HU-24)', async () => {
      const { gateway, http } = setup(activeRoom(true));

      const live = await gateway.buyNow('room-1', 'round-2');

      expect(http.post).toHaveBeenCalledWith('/rounds/round-2/buy-now');
      expect(live.round?.id).toBe('round-2');
    });

    it('compra la ronda indicada aunque la sala ya haya pasado a otra: el servicio decide (HU-24)', async () => {
      const { gateway, http } = setup(activeRoom(true));

      await gateway.buyNow('room-1', 'round-1');

      // No se cambia por la ronda activa: eso compraria otro objeto.
      expect(http.post).toHaveBeenCalledWith('/rounds/round-1/buy-now');
    });

    it('si el servicio rechaza la compra, propaga el error sin releer la sala (HU-24)', async () => {
      const { gateway, http } = setup(activeRoom(true));
      const rejected = new ApiError({ type: '/problems/conflict', title: 'Conflicto', status: 409, detail: 'No tienes ECICoin disponibles suficientes para la compra inmediata.' });
      http.post.mockRejectedValueOnce(rejected);
      http.get.mockClear();

      await expect(gateway.buyNow('room-1', 'round-2')).rejects.toBe(rejected);
      expect(http.get).not.toHaveBeenCalled();
    });

    it('publica el precio de compra inmediata de la ronda, o ninguno si no lo tiene (HU-24)', async () => {
      const detail = activeRoom(true);
      detail.rounds[1] = { ...detail.rounds[1], buyNowPrice: '80000.00' };
      const { gateway } = setup(detail);

      expect((await gateway.liveRoom('room-1')).round?.buyNowPrice).toBe(80000);
      const [first, second] = await gateway.items();
      expect(first.buyNowPrice).toBeNull();
      expect(second.buyNowPrice).toBe(80000);
    });

    it('trae la puja automatica de quien participa desde el estado de la sala (HU-22)', async () => {
      const { gateway } = setup(activeRoom(true), {
        autoBid: { enabled: true, maximumAmount: '90000.00', stopped: true, stoppedReason: 'INSUFFICIENT_FUNDS' },
      });

      const live = await gateway.liveRoom('room-1');

      expect(live.autoBid).toEqual({ enabled: true, limit: 90000, stopped: true, stoppedReason: 'INSUFFICIENT_FUNDS' });
    });

    it('sin puja automatica declarada la muestra apagada', async () => {
      const { gateway } = setup(activeRoom(true));
      const live = await gateway.liveRoom('room-1');
      expect(live.autoBid).toEqual({ enabled: false, limit: 0, stopped: false, stoppedReason: null });
    });

    it('quien solo sigue la sala cuenta con la hora que trae la sala, no con su reloj', async () => {
      const { gateway } = setup({ ...activeRoom(false), serverTime: SERVER_TIME });
      const live = await gateway.liveRoom('room-1');
      expect(live.serverTime).toBe(SERVER_TIME);
      expect(live.room.serverTime).toBe(SERVER_TIME);
    });

    it('declara el limite de la puja automatica sobre la ronda activa', async () => {
      const { gateway, http } = setup(activeRoom(true));

      const live = await gateway.setAutoBid('room-1', 'round-2', { enabled: true, limit: 90000 });

      expect(http.put).toHaveBeenCalledWith('/rounds/round-2/auto-bid', { enabled: true, maximumAmount: 90000 });
      expect(live.round?.id).toBe('round-2');
    });

    it('desactivar la puja automatica no envia limite', async () => {
      const { gateway, http } = setup(activeRoom(true));
      await gateway.setAutoBid('room-1', 'round-2', { enabled: false, limit: 90000 });
      expect(http.put).toHaveBeenCalledWith('/rounds/round-2/auto-bid', { enabled: false });
    });

    it('declara la puja automatica en la ronda vista aunque la sala ya haya pasado a otra (HU-25)', async () => {
      const { gateway, http } = setup(activeRoom(true));
      await gateway.setAutoBid('room-1', 'round-1', { enabled: true, limit: 90000 });
      // No se cambia por la ronda activa: el servicio rechaza la ronda cerrada.
      expect(http.put).toHaveBeenCalledWith('/rounds/round-1/auto-bid', { enabled: true, maximumAmount: 90000 });
    });

    it('puja en la ronda vista aunque la sala ya haya pasado a otra: nunca en el siguiente objeto (HU-25)', async () => {
      const { gateway, http } = setup(activeRoom(true));

      await gateway.placeBid('room-1', 'round-1', 50000);

      expect(http.post).toHaveBeenCalledWith('/rounds/round-1/bids', { amount: 50000 });
      expect(http.post).not.toHaveBeenCalledWith('/rounds/round-2/bids', expect.anything());
    });

    it('si el servicio rechaza la puja por ronda cerrada, propaga el 409 (HU-25)', async () => {
      const { gateway, http } = setup(activeRoom(true));
      const closed = new ApiError({ type: '/problems/conflicto', title: 'Conflict', status: 409, detail: 'La ronda no esta activa.' });
      http.post.mockRejectedValueOnce(closed);

      await expect(gateway.placeBid('room-1', 'round-1', 50000)).rejects.toBe(closed);
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

    it('la extension del cierre y el fin de la sala tambien releen el estado (HU-18, HU-23)', async () => {
      const { gateway, emit, detailReads } = withChannel();
      const listener = vi.fn();
      gateway.subscribe('room-1', listener);

      emit({ name: 'round.extended', roundId: 'round-1' });
      await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
      emit({ name: 'room.status', status: 'CLOSED' });
      await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(2));
      expect(detailReads()).toBe(2);
    });

    it('dejar de escuchar suelta la sala del canal', () => {
      const { gateway, leave } = withChannel();
      gateway.subscribe('room-1', vi.fn())();
      expect(leave).toHaveBeenCalledOnce();
    });
  });

  it('mis pujas: solo salas donde participo y rondas donde puje, con su estado', async () => {
    const { gateway, http } = setup();
    const detail = room({
      status: 'ACTIVE',
      isParticipant: true,
      rounds: [
        round({ status: 'CLOSED', result: 'AWARDED', isLeading: true, hasBids: true, currentPrice: '275.00', myHighestBid: '275.00' }),
        round({ id: 'round-2', position: 2, status: 'CLOSED', result: 'AWARDED', hasBids: true, currentPrice: '900.00', myHighestBid: '500.00' }),
        round({ id: 'round-3', position: 3, status: 'ACTIVE', hasBids: true, isLeading: true, currentPrice: '120.00', myHighestBid: '120.00' }),
        round({ id: 'round-4', position: 4, status: 'ACTIVE', hasBids: true, currentPrice: '800.00', myHighestBid: '650.00' }),
        round({ id: 'round-5', position: 5, status: 'SCHEDULED' }),
      ],
    });
    http.get.mockImplementation((path: string) =>
      Promise.resolve(path === '/rooms' ? [{ id: 'room-1', isParticipant: true }, { id: 'ajena', isParticipant: false }] : detail),
    );

    const bids = await gateway.myBids();

    expect(bids.map((bid) => [bid.status, bid.amount, bid.outbidBy])).toEqual([
      ['WON', 275, null],
      ['LOST', 500, null],
      ['WINNING', 120, null],
      ['OUTBID', 650, 150],
    ]);
    // La sala donde no participo ni siquiera se consulta.
    expect(http.get).not.toHaveBeenCalledWith('/rooms/ajena');
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

  it('lo que el servicio aun no ofrece responde vacio en vez de inventar datos', async () => {
    const { gateway } = setup();

    await expect(gateway.myBids()).resolves.toEqual([]);
  });

  describe('detalle de las salas en el listado', () => {
    const detailCalls = (get: ReturnType<typeof vi.fn>) =>
      get.mock.calls.filter(([path]) => path === '/rooms/room-1').length;

    it('una sala cerrada se pide una sola vez: ya no cambia', async () => {
      const { gateway, http } = setup(room({ status: 'CLOSED', rounds: [round({ status: 'CLOSED' })] }));

      await gateway.items();
      await gateway.items();
      await gateway.myBids();

      expect(detailCalls(http.get)).toBe(1);
    });

    it('una sala abierta se relee en cada listado', async () => {
      const { gateway, http } = setup(room({ status: 'ACTIVE', rounds: [round({ status: 'ACTIVE' })] }));

      await gateway.items();
      await gateway.items();

      expect(detailCalls(http.get)).toBe(2);
    });
  });

  describe('listado en lote (GET /rooms?include=rounds, GET /items?ids=)', () => {
    const openRoom = room({
      status: 'ACTIVE',
      rounds: [
        round({ status: 'ACTIVE' }),
        round({ id: 'round-2', position: 2, entries: [{ kind: 'ITEM', catalogId: 'item-2' }] }),
      ],
    });

    function batchSetup({ auctionKnowsInclude = true, catalogKnowsIds = true } = {}) {
      const { gateway, http, items } = setup(openRoom);
      http.get.mockImplementation((path: string, options?: { query?: Record<string, unknown> }) => {
        if (path === '/rooms' && options?.query?.include === 'rounds') {
          return Promise.resolve(auctionKnowsInclude ? [openRoom] : [{ id: openRoom.id, status: 'ACTIVE' }]);
        }
        if (path === '/rooms') return Promise.resolve([{ id: openRoom.id, status: 'ACTIVE' }]);
        return Promise.resolve(openRoom);
      });
      const list = vi.fn((query: { ids?: string[] }) =>
        catalogKnowsIds
          ? Promise.resolve(
              (query.ids ?? []).map((id) => ({
                id,
                name: `Objeto ${id}`,
                description: '',
                category: 'Electrónica',
                condition: 'GOOD',
                coverUrl: `https://blob/${id}.png`,
              })),
            )
          : Promise.reject(new ApiError({ type: 'about:blank', title: 'Bad Request', status: 400 })),
      );
      (items as unknown as { list: typeof list }).list = list;
      return { gateway, http, items, list };
    }

    const detailCalls = (get: ReturnType<typeof vi.fn>) =>
      get.mock.calls.filter(([path]) => path === `/rooms/${openRoom.id}`).length;

    it('trae las salas abiertas con sus rondas sin pedir el detalle sala por sala', async () => {
      const { gateway, http } = batchSetup();

      const result = await gateway.items();

      expect(result).toHaveLength(2);
      expect(detailCalls(http.get)).toBe(0);
    });

    it('pide las fichas de todas las rondas en una sola llamada a catalog', async () => {
      const { gateway, items, list } = batchSetup();

      const [first, second] = await gateway.items();

      expect(list).toHaveBeenCalledOnce();
      expect(list.mock.calls[0][0].ids).toEqual(['item-1', 'item-2']);
      expect(items.findById).not.toHaveBeenCalled();
      expect(first.imageUrl).toBe('https://blob/item-1.png');
      expect(second.name).toBe('Objeto item-2');
    });

    it('con un auction que aun no conoce include, pide el detalle sala por sala', async () => {
      const { gateway, http } = batchSetup({ auctionKnowsInclude: false });

      await expect(gateway.items()).resolves.toHaveLength(2);
      expect(detailCalls(http.get)).toBe(1);
    });

    it('con un catalog que aun no conoce ids, resuelve cada ficha por separado', async () => {
      const { gateway, items } = batchSetup({ catalogKnowsIds: false });

      const [first] = await gateway.items();

      expect(items.findById).toHaveBeenCalledTimes(2);
      expect(first.name).toBe('Portatil Lenovo');
    });
  });

  describe('cache de las fichas de catalog', () => {
    const inMinutes = (minutes: number) =>
      `https://blob/item-1.png?se=${encodeURIComponent(new Date(Date.now() + minutes * 60_000).toISOString())}&sig=x`;

    const withPhotos = (...urls: string[]) => {
      const { gateway, items } = setup();
      const findById = vi.mocked(items.findById);
      const ficha = { name: 'Portatil Lenovo', description: '', category: 'Electrónica', condition: 'GOOD', video: null };
      for (const url of urls) findById.mockResolvedValueOnce({ ...ficha, photos: [{ url }] } as never);
      return { gateway, findById };
    };

    it('reutiliza la ficha mientras la foto siga vigente', async () => {
      const { gateway, findById } = withPhotos(inMinutes(14));

      await gateway.items();
      await gateway.items();

      expect(findById).toHaveBeenCalledTimes(1);
    });

    it('relee la ficha si la foto cacheada esta por caducar, en vez de servirla vencida', async () => {
      // catalog entrega una firma reutilizada a la que le queda un minuto de vida.
      const casiVencida = inMinutes(1);
      const nueva = inMinutes(15);
      const { gateway, findById } = withPhotos(casiVencida, nueva);

      const [first] = await gateway.items();
      const [again] = await gateway.items();

      expect(findById).toHaveBeenCalledTimes(2);
      expect(first.imageUrl).toBe(casiVencida);
      expect(again.imageUrl).toBe(nueva);
    });
  });
});

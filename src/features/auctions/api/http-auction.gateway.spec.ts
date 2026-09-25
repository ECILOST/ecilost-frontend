import { describe, expect, it, vi } from 'vitest';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import type { RoomDetail, RoundDetail } from '@/features/rooms/model/room';
import type { HttpClient } from '@/shared/api/http-client';
import { ApiError } from '@/shared/api/problem-details';
import { createHttpAuctionGateway } from './http-auction.gateway';

const round = (overrides: Partial<RoundDetail> = {}): RoundDetail => ({
  id: 'round-1',
  position: 1,
  status: 'SCHEDULED',
  startingPrice: '50000.00',
  currentPrice: '50000.00',
  hasBids: false,
  isLeading: false,
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

function setup(detail: RoomDetail = room()) {
  const http = {
    baseUrl: '/api/auction',
    get: vi.fn((path: string) =>
      Promise.resolve(
        path === '/rooms' ? [{ id: detail.id }] : detail,
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

  it('la sala en vivo falla con 501 explicito en vez de inventar datos', async () => {
    const { gateway } = setup();

    await expect(gateway.liveRoom('room-1')).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.status === 501,
    );
    await expect(gateway.myBids()).resolves.toEqual([]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/api/http-client';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import { createPickupGateway, type Conversation } from './pickup.gateway';

const pickup: Conversation = {
  roundId: 'round/1', roomId: 'room', winnerId: 'winner', status: 'PENDING',
  entries: [{ kind: 'ITEM', catalogId: 'item' }, { kind: 'LOT', catalogId: 'lot' }],
  createdAt: '2030-01-01T12:00:00Z', slot: null, messages: [],
};

function setup() {
  const http = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
  const items = { findById: vi.fn().mockResolvedValue({ name: 'Portátil' }) };
  const lots = { findById: vi.fn().mockResolvedValue({ name: 'Lote de libros' }) };
  const gateway = createPickupGateway(http as unknown as HttpClient, items as unknown as ItemGateway, lots as unknown as LotGateway);
  return { http, items, lots, gateway };
}

describe('pickup gateway', () => {
  it.each([false, true])('lists and describes pickups for staff=%s, caching catalog names', async (staff) => {
    const { http, items, lots, gateway } = setup();
    http.get.mockResolvedValue([pickup, pickup]);
    expect(await gateway.list(staff)).toEqual([
      expect.objectContaining({ title: 'Portátil · Lote de libros' }),
      expect.objectContaining({ title: 'Portátil · Lote de libros' }),
    ]);
    expect(http.get).toHaveBeenCalledWith(staff ? '/pickups/staff' : '/pickups/mine');
    expect(items.findById).toHaveBeenCalledOnce();
    expect(lots.findById).toHaveBeenCalledOnce();
  });

  it('encodes round IDs and preserves conversations without catalog entries', async () => {
    const { http, gateway } = setup();
    const empty = { ...pickup, entries: [] };
    http.get.mockResolvedValue(empty);
    expect(await gateway.conversation(true, pickup.roundId)).toBe(empty);
    expect(http.get).toHaveBeenCalledWith('/pickups/staff/round%2F1');
  });

  it('keeps pickups readable when catalog fails and retries names on the next read', async () => {
    const { http, items, lots, gateway } = setup();
    http.get.mockResolvedValue(pickup);
    items.findById.mockRejectedValueOnce(new Error('Catalog unavailable'));
    lots.findById.mockRejectedValueOnce(new Error('Catalog unavailable'));
    expect(await gateway.conversation(false, pickup.roundId)).toMatchObject({ title: undefined });
    expect(await gateway.conversation(false, pickup.roundId)).toMatchObject({ title: 'Portátil · Lote de libros' });
    expect(items.findById).toHaveBeenCalledTimes(2);
  });

  it('routes slot reads and creation to their public and staff endpoints', async () => {
    const { http, gateway } = setup();
    http.get.mockResolvedValue([]);
    await gateway.slots(false);
    await gateway.slots(true);
    const input = { location: 'Recepción', startsAt: '2030-01-01T12:00:00Z', endsAt: '2030-01-01T13:00:00Z', capacity: 2 };
    await gateway.createSlot(input);
    expect(http.get.mock.calls).toEqual([['/pickups/slots'], ['/pickups/staff/slots']]);
    expect(http.post).toHaveBeenCalledWith('/pickups/staff/slots', input);
  });

  it('sends bookings, codes, messages and delivery operations with their existing contracts', async () => {
    const { http, gateway } = setup();
    await gateway.book(pickup.roundId, 'slot');
    await gateway.code(pickup.roundId);
    await gateway.message(false, pickup.roundId, 'Ayuda');
    await gateway.message(true, pickup.roundId, 'Respuesta');
    await gateway.missed(pickup.roundId);
    await gateway.deliver(pickup.roundId, 'delivery-code');
    expect(http.post.mock.calls).toEqual([
      ['/pickups/mine/round%2F1/booking', { slotId: 'slot' }],
      ['/pickups/mine/round%2F1/code'],
      ['/pickups/mine/round%2F1/help', { message: 'Ayuda' }],
      ['/pickups/staff/round%2F1/reply', { message: 'Respuesta' }],
      ['/pickups/staff/round%2F1/missed'],
      ['/pickups/staff/round%2F1/delivery', { code: 'delivery-code' }],
    ]);
  });

  it('propagates failed commands to the caller', async () => {
    const { http, gateway } = setup();
    const failure = new Error('Booking conflict');
    http.post.mockRejectedValue(failure);
    await expect(gateway.book('round', 'slot')).rejects.toBe(failure);
  });
});

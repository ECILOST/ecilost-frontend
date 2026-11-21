import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/api/http-client';
import { createHttpNotificationGateway } from './http-notification.gateway';

function engagementWith(items: unknown[]) {
  return {
    get: vi.fn().mockResolvedValue({ items }),
    post: vi.fn().mockResolvedValue(undefined),
  } as unknown as HttpClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
}

describe('createHttpNotificationGateway', () => {
  it('la bandeja viene de engagement, con sus avisos traducidos', async () => {
    const engagement = engagementWith([
      { id: 'n3', kind: 'ROUND_CLOSED', roomId: 'room-1', payload: { position: 2, currentPrice: '90.00' }, createdAt: '2030-10-01T21:06:00.000Z', readAt: null },
      { id: 'n2', kind: 'ROUND_WON', roomId: 'room-1', payload: { position: 1, currentPrice: '200.00' }, createdAt: '2030-10-01T21:05:00.000Z', readAt: null },
      { id: 'n1', kind: 'OUTBID', roomId: 'room-1', payload: { position: 1, currentPrice: '150.00' }, createdAt: '2030-10-01T21:04:00.000Z', readAt: '2030-10-01T21:04:30.000Z' },
    ]);
    const gateway = createHttpNotificationGateway(engagement);

    const inbox = await gateway.list();
    expect(engagement.get).toHaveBeenCalledWith('/notifications');
    expect(inbox.map((n) => [n.kind, n.read])).toEqual([
      ['ROOM_CLOSED', false],
      ['WON', false],
      ['OUTBID', true],
    ]);
    expect(inbox[1].body).toContain('200');

    await gateway.markAllRead();
    expect(engagement.post).toHaveBeenCalledWith('/notifications/read');
  });

  it('no inventa montos ni disfraza avisos que no conoce', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gateway = createHttpNotificationGateway(
      engagementWith([
        { id: 'a', kind: 'ROUND_WON', roomId: 'room-1', payload: { position: 3 }, createdAt: '2030-10-01T21:05:00.000Z', readAt: null },
        { id: 'b', kind: 'ALGO_NUEVO', roomId: 'room-1', payload: {}, createdAt: '2030-10-01T21:05:00.000Z', readAt: null },
      ]),
    );

    const inbox = await gateway.list();
    expect(inbox).toHaveLength(1);
    expect(inbox[0].body).toBe('Ganaste el objeto 3.');
    expect(inbox[0].body).not.toContain('0 ECICoin');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

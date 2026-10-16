import { describe, expect, it, vi } from 'vitest';
import type { AuctionGateway } from '../ports/auction.gateway';
import { createLazyAuctionGateway } from './lazy-auction.gateway';

function fakeGateway() {
  const stop = vi.fn();
  const gateway = {
    items: vi.fn(() => Promise.resolve([])),
    subscribe: vi.fn(() => stop),
  } as unknown as AuctionGateway;
  return { gateway, stop };
}

describe('createLazyAuctionGateway', () => {
  it('no descarga nada hasta el primer uso, y descarga una sola vez', async () => {
    const { gateway } = fakeGateway();
    const load = vi.fn(() => Promise.resolve(gateway));
    const lazy = createLazyAuctionGateway(load);
    expect(load).not.toHaveBeenCalled();

    await Promise.all([lazy.items(), lazy.items()]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(gateway.items).toHaveBeenCalledTimes(2);
  });

  it('cancelar antes de que llegue el codigo no deja una suscripcion abierta', async () => {
    const { gateway } = fakeGateway();
    const lazy = createLazyAuctionGateway(() => Promise.resolve(gateway));

    const unsubscribe = lazy.subscribe('room-1', () => undefined);
    unsubscribe();
    await Promise.resolve();
    await Promise.resolve();

    expect(gateway.subscribe).not.toHaveBeenCalled();
  });

  it('cancelar despues suelta la suscripcion real', async () => {
    const { gateway, stop } = fakeGateway();
    const lazy = createLazyAuctionGateway(() => Promise.resolve(gateway));

    const unsubscribe = lazy.subscribe('room-1', () => undefined);
    await vi.waitFor(() => expect(gateway.subscribe).toHaveBeenCalled());
    unsubscribe();

    expect(stop).toHaveBeenCalled();
  });
});

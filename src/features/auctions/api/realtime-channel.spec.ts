import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (payload?: Record<string, unknown>) => void;

const socket = {
  connected: true,
  handlers: new Map<string, Handler>(),
  emit: vi.fn(),
  on(name: string, handler: Handler) {
    this.handlers.set(name, handler);
    return this;
  },
};

vi.mock('socket.io-client', () => ({ io: vi.fn(() => socket) }));

const { createSocketRealtimeChannel } = await import('./realtime-channel');

describe('createSocketRealtimeChannel', () => {
  beforeEach(() => {
    socket.handlers.clear();
    socket.emit.mockClear();
  });

  function listen() {
    const channel = createSocketRealtimeChannel({ url: '', getToken: () => 'jwt' });
    const listener = vi.fn();
    channel.joinRoom('room-1', listener);
    const fire = (name: string, payload: Record<string, unknown>) => socket.handlers.get(name)?.(payload);
    return { listener, fire };
  }

  it('entra a la sala al escucharla', () => {
    listen();
    // Con el token vigente: el del handshake vence y la conexion puede durar mas.
    expect(socket.emit).toHaveBeenCalledWith('room.join', { roomId: 'room-1', token: 'jwt' });
  });

  it('entrega la extension del cierre como evento de la ronda (HU-23)', () => {
    const { listener, fire } = listen();
    fire('round.extended', { eventId: 'e-1', roomId: 'room-1', roundId: 'round-1', endsAt: '2030-01-01T10:04:00.000Z' });
    expect(listener).toHaveBeenCalledWith({ name: 'round.extended', roundId: 'round-1' });
  });

  it('entrega el cambio de estado de la sala aunque no sea de ninguna ronda (HU-18)', () => {
    const { listener, fire } = listen();
    fire('room.status', { eventId: 'e-2', roomId: 'room-1', status: 'CLOSED' });
    expect(listener).toHaveBeenCalledWith({ name: 'room.status', status: 'CLOSED' });
  });

  it('descarta un evento repetido por su eventId', () => {
    const { listener, fire } = listen();
    fire('round.price', { eventId: 'e-3', roomId: 'room-1', roundId: 'round-1', sequence: '4' });
    fire('round.price', { eventId: 'e-3', roomId: 'room-1', roundId: 'round-1', sequence: '4' });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ name: 'round.price', roundId: 'round-1', sequence: 4 });
  });

  it('ignora los eventos de ronda que no dicen de que ronda son', () => {
    const { listener, fire } = listen();
    fire('round.closed', { eventId: 'e-4', roomId: 'room-1' });
    expect(listener).not.toHaveBeenCalled();
  });
});

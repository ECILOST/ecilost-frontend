import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (payload?: Record<string, unknown>) => void;

const socket = {
  connected: true,
  handlers: new Map<string, Handler>(),
  emit: vi.fn(),
  emitWithAck: vi.fn(),
  timeout() {
    return this;
  },
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
    socket.emitWithAck.mockReset();
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

  describe('chat', () => {
    const message = { id: 'm-1', roomId: 'room-1', alias: 'Participante AAAA', body: 'hola', createdAt: '2030-01-01T10:00:00.000Z' };

    function chat() {
      const channel = createSocketRealtimeChannel({ url: '', getToken: () => 'jwt' });
      const listener = vi.fn();
      const stop = channel.joinChat('room-1', listener);
      const fire = (name: string, payload?: Record<string, unknown>) => socket.handlers.get(name)?.(payload);
      return { channel, listener, stop, fire };
    }

    it('entra al chat con el token vigente y entrega el historial', async () => {
      socket.emitWithAck.mockResolvedValue({ ok: true, alias: 'Participante AAAA', canWrite: true, messages: [message] });
      const { listener } = chat();
      expect(socket.emitWithAck).toHaveBeenCalledWith('chat.join', { roomId: 'room-1', token: 'jwt' });
      await vi.waitFor(() =>
        expect(listener).toHaveBeenCalledWith({ name: 'chat.joined', ok: true, alias: 'Participante AAAA', canWrite: true, messages: [message] }),
      );
    });

    it('un rechazo o la falta de respuesta llegan como chat no disponible', async () => {
      socket.emitWithAck.mockResolvedValueOnce({ ok: false, reason: 'not-participant' });
      const rejected = chat();
      await vi.waitFor(() => expect(rejected.listener).toHaveBeenCalledWith({ name: 'chat.joined', ok: false, reason: 'not-participant' }));

      socket.emitWithAck.mockRejectedValueOnce(new Error('timeout'));
      const silent = chat();
      await vi.waitFor(() => expect(silent.listener).toHaveBeenCalledWith({ name: 'chat.joined', ok: false, reason: 'unavailable' }));
    });

    it('reparte los mensajes en vivo a quien escucha esa sala', async () => {
      socket.emitWithAck.mockResolvedValue({ ok: true, alias: null, canWrite: false, messages: [] });
      const { listener, fire } = chat();
      fire('chat.message', { ...message, serverTime: '2030-01-01T10:00:01.000Z' });
      fire('chat.message', { ...message, id: 'm-2', roomId: 'otra-sala' });
      expect(listener).toHaveBeenCalledWith({ name: 'chat.message', message });
      expect(listener).not.toHaveBeenCalledWith(expect.objectContaining({ message: expect.objectContaining({ id: 'm-2' }) }));
    });

    it('al reconectar vuelve a entrar al chat', async () => {
      socket.emitWithAck.mockResolvedValue({ ok: true, alias: null, canWrite: false, messages: [] });
      const { fire } = chat();
      socket.emitWithAck.mockClear();
      fire('connect');
      expect(socket.emitWithAck).toHaveBeenCalledWith('chat.join', { roomId: 'room-1', token: 'jwt' });
    });

    it('dejar de escuchar sale del chat', () => {
      socket.emitWithAck.mockResolvedValue({ ok: true, alias: null, canWrite: false, messages: [] });
      const { stop } = chat();
      stop();
      expect(socket.emit).toHaveBeenCalledWith('chat.leave', { roomId: 'room-1' });
    });

    it('enviar devuelve lo que respondio engagement', async () => {
      const { channel } = chat();
      socket.emitWithAck.mockResolvedValueOnce({ ok: true, message });
      await expect(channel.sendChat('room-1', 'hola')).resolves.toEqual({ ok: true });
      expect(socket.emitWithAck).toHaveBeenLastCalledWith('chat.send', { roomId: 'room-1', text: 'hola', token: 'jwt' });

      socket.emitWithAck.mockResolvedValueOnce({ ok: false, reason: 'too-fast' });
      await expect(channel.sendChat('room-1', 'otra')).resolves.toEqual({ ok: false, reason: 'too-fast' });

      socket.emitWithAck.mockRejectedValueOnce(new Error('timeout'));
      await expect(channel.sendChat('room-1', 'otra')).resolves.toEqual({ ok: false, reason: 'unavailable' });
    });
  });
});

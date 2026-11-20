import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTokenStore } from '@/shared/api/token-store';

type Handler = (payload?: unknown) => void;
type Authorize = (send: (credentials: { token: string | null }) => void) => void;

let authorize: Authorize;

const socket = {
  connected: true,
  active: true,
  handlers: new Map<string, Handler>(),
  emit: vi.fn(),
  emitWithAck: vi.fn(),
  sendAuth: vi.fn(),
  connect: vi.fn((): void => {
    socket.active = true;
    authorize(socket.sendAuth);
  }),
  disconnect: vi.fn(),
  timeout() {
    return this;
  },
  on(name: string, handler: Handler) {
    this.handlers.set(name, handler);
    return this;
  },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn((_url: string, options: { auth: Authorize }) => {
    authorize = options.auth;
    authorize(socket.sendAuth);
    return socket;
  }),
}));

const { createSocketRealtimeChannel } = await import('./realtime-channel');

describe('createSocketRealtimeChannel', () => {
  beforeEach(() => {
    socket.connected = true;
    socket.active = true;
    socket.handlers.clear();
    socket.emit.mockClear();
    socket.emitWithAck.mockReset();
    socket.sendAuth.mockClear();
    socket.connect.mockClear();
    socket.disconnect.mockClear();
  });

  function fixture() {
    const tokens = createTokenStore();
    tokens.set('jwt');
    const requestSessionRecovery = vi.fn();
    const channel = createSocketRealtimeChannel({ url: '', tokens, requestSessionRecovery });
    const fire = (name: string, payload?: unknown) => socket.handlers.get(name)?.(payload);
    return { channel, tokens, requestSessionRecovery, fire };
  }

  function listen() {
    const { channel, fire } = fixture();
    const listener = vi.fn();
    channel.joinRoom('room-1', listener);
    return { listener, fire };
  }

  it('entra a la sala al escucharla', () => {
    listen();
    // Se manda el token vigente para que Engagement pueda consultar la sala en Auction.
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

  describe('vencimiento de la conexion', () => {
    function serverClosed(fire: ReturnType<typeof fixture>['fire']) {
      socket.connected = false;
      socket.active = false;
      fire('disconnect', 'io server disconnect');
    }

    it('reconecta con el token ya renovado y resincroniza la sala y el chat', () => {
      const { channel, tokens, requestSessionRecovery, fire } = fixture();
      const roomListener = vi.fn();
      channel.joinRoom('room-1', roomListener);
      channel.joinChat('room-1', vi.fn());
      tokens.set('jwt-renewed');

      serverClosed(fire);

      expect(requestSessionRecovery).not.toHaveBeenCalled();
      expect(socket.connect).toHaveBeenCalledOnce();
      expect(socket.sendAuth).toHaveBeenLastCalledWith({ token: 'jwt-renewed' });
      socket.connected = true;
      fire('connect');

      expect(socket.emit).toHaveBeenLastCalledWith('room.join', { roomId: 'room-1', token: 'jwt-renewed' });
      expect(socket.emitWithAck).toHaveBeenLastCalledWith('chat.join', { roomId: 'room-1', token: 'jwt-renewed' });
      expect(roomListener).toHaveBeenCalledWith({ name: 'resync' });
    });

    it('pide un solo canje y espera el token nuevo antes de reconectar', () => {
      const { channel, tokens, requestSessionRecovery, fire } = fixture();
      channel.joinRoom('room-1', vi.fn());

      serverClosed(fire);
      fire('connect_error', new Error('auth rejected'));
      expect(requestSessionRecovery).toHaveBeenCalledOnce();
      expect(socket.connect).not.toHaveBeenCalled();

      tokens.set('jwt-renewed');
      expect(socket.connect).toHaveBeenCalledOnce();
      expect(socket.sendAuth).toHaveBeenLastCalledWith({ token: 'jwt-renewed' });

      socket.active = false;
      fire('connect_error', new Error('auth still rejected'));
      expect(requestSessionRecovery).toHaveBeenCalledOnce();
      expect(socket.connect).toHaveBeenCalledOnce();
    });

    it('deja los reintentos de transporte a Socket.IO', () => {
      const { channel, requestSessionRecovery, fire } = fixture();
      channel.joinRoom('room-1', vi.fn());
      socket.connected = false;
      fire('disconnect', 'transport close');
      fire('connect_error', new Error('transport unavailable'));

      expect(requestSessionRecovery).not.toHaveBeenCalled();
      expect(socket.connect).not.toHaveBeenCalled();
    });

    it('no reconecta si la recuperacion deja la sesion cerrada', () => {
      const { channel, tokens, requestSessionRecovery, fire } = fixture();
      channel.joinRoom('room-1', vi.fn());
      requestSessionRecovery.mockImplementation(() => tokens.set(null));

      serverClosed(fire);
      fire('connect_error', new Error('no session'));
      tokens.set('another-session');

      expect(requestSessionRecovery).toHaveBeenCalledOnce();
      expect(socket.connect).not.toHaveBeenCalled();
    });

    it('cancela la reconexion al dejar la ultima suscripcion', () => {
      const { channel, tokens, fire } = fixture();
      const stop = channel.joinRoom('room-1', vi.fn());

      serverClosed(fire);
      stop();
      tokens.set('jwt-renewed');

      expect(socket.disconnect).toHaveBeenCalledOnce();
      expect(socket.connect).not.toHaveBeenCalled();
    });
  });

  describe('chat', () => {
    const message = { id: 'm-1', roomId: 'room-1', alias: 'Participante AAAA', body: 'hola', createdAt: '2030-01-01T10:00:00.000Z' };

    function chat() {
      const { channel, fire } = fixture();
      const listener = vi.fn();
      const stop = channel.joinChat('room-1', listener);
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

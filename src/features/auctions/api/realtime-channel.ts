import { io, type Socket } from 'socket.io-client';

/** Lo que el canal de ecilost-engagement-service empuja sobre una sala. */
export type RoomEvent =
  | { name: 'round.price'; roundId: string; sequence: number }
  | { name: 'round.activated' | 'round.closed' | 'bid.outbid' | 'round.won'; roundId: string }
  /** El canal se reconecto: lo que se tenia puede estar vencido. */
  | { name: 'resync' };

/**
 * Canal en vivo de las salas (HU-26, HU-27).
 *
 * `joinRoom` devuelve la funcion para dejar de escuchar. Varias pantallas pueden escuchar la
 * misma sala: la suscripcion al servidor se hace una vez y se suelta con la ultima.
 */
export interface RealtimeChannel {
  joinRoom(roomId: string, listener: (event: RoomEvent) => void): () => void;
}

const ROOM_EVENTS = ['round.price', 'round.activated', 'round.closed'] as const;
const PERSONAL_EVENTS = ['bid.outbid', 'round.won'] as const;

/** Cuantos `eventId` se recuerdan para descartar reemisiones. */
const SEEN_WINDOW = 1_000;

interface Payload {
  eventId?: string;
  roomId?: string;
  roundId?: string;
  sequence?: string;
}

/**
 * Socket.IO contra el namespace `/realtime` de engagement. El token se pide en cada
 * conexion y no una vez: dura quince minutos, y al reconectar debe ir el vigente.
 *
 * No hay estado compartido que proteger con bloqueos: cada evento se reparte a quien escucha
 * su sala, y quien escucha decide que hacer con el (releer la sala una sola vez aunque
 * lleguen varios). Los repetidos se descartan por `eventId`, porque engagement puede
 * reemitir tras un reinicio.
 */
export function createSocketRealtimeChannel({
  url,
  getToken,
}: {
  url: string;
  getToken: () => string | null;
}): RealtimeChannel {
  let socket: Socket | null = null;
  const listeners = new Map<string, Set<(event: RoomEvent) => void>>();
  const seen = new Set<string>();

  const dispatch = (roomId: string, event: RoomEvent) =>
    listeners.get(roomId)?.forEach((listener) => listener(event));

  const firstTime = (eventId: string | undefined): boolean => {
    if (!eventId) return true;
    if (seen.has(eventId)) return false;
    seen.add(eventId);
    if (seen.size > SEEN_WINDOW) seen.delete(seen.values().next().value as string);
    return true;
  };

  function connect(): Socket {
    if (socket) return socket;

    socket = io(`${url}/realtime`, {
      auth: (send) => send({ token: getToken() }),
      transports: ['websocket'],
    });

    // Al (re)conectar se vuelve a entrar a cada sala y se pide releer: los eventos que
    // pasaron mientras no habia conexion no se van a recibir.
    socket.on('connect', () => {
      for (const roomId of listeners.keys()) {
        socket?.emit('room.join', { roomId });
        dispatch(roomId, { name: 'resync' });
      }
    });

    for (const name of [...ROOM_EVENTS, ...PERSONAL_EVENTS]) {
      socket.on(name, (payload: Payload) => {
        if (!payload.roomId || !payload.roundId) return;
        // El mismo evento llega a la sala y al canal personal: se entrega una sola vez por
        // nombre, asi que la llave es nombre + eventId.
        if (!firstTime(payload.eventId && `${name}:${payload.eventId}`)) return;

        dispatch(
          payload.roomId,
          name === 'round.price'
            ? { name, roundId: payload.roundId, sequence: Number(payload.sequence ?? 0) }
            : { name, roundId: payload.roundId },
        );
      });
    }

    return socket;
  }

  return {
    joinRoom(roomId, listener) {
      const connection = connect();
      let roomListeners = listeners.get(roomId);
      if (!roomListeners) {
        roomListeners = new Set();
        listeners.set(roomId, roomListeners);
        if (connection.connected) connection.emit('room.join', { roomId });
      }
      roomListeners.add(listener);

      return () => {
        const current = listeners.get(roomId);
        current?.delete(listener);
        if (current && current.size === 0) {
          listeners.delete(roomId);
          socket?.emit('room.leave', { roomId });
        }
      };
    },
  };
}

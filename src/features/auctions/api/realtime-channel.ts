import { io, type Socket } from 'socket.io-client';

/** Lo que el canal de ecilost-engagement-service empuja sobre una sala. */
export type RoomEvent =
  | { name: 'round.price'; roundId: string; sequence: number }
  | {
      name:
        | 'round.activated'
        | 'round.closed'
        | 'round.extended'
        | 'bid.outbid'
        | 'round.won';
      roundId: string;
    }
  /** Subastas dinamicas: el dueño giro la ruleta de una ronda; la sala lo anima. */
  | { name: 'round.mode'; roundId: string; segment: string | null; mode: string | null }
  /** Subastas dinamicas: alguien sello su puja en un sobre cerrado (solo el conteo). */
  | { name: 'round.sealed'; roundId: string; sealedCount: number }
  /** La sala empezo o termino (HU-18): no es de ninguna ronda. */
  | { name: 'room.status'; status: string }
  /** El canal se reconecto: lo que se tenia puede estar vencido. */
  | { name: 'resync' };

/** Un mensaje del chat tal como lo emite engagement (`chat.message` y el historial). */
export interface ChatMessageWire {
  id: string;
  roomId: string;
  alias: string;
  body: string;
  createdAt: string;
}

/** Lo que pasa en el chat de una sala. */
export type ChatEvent =
  /** Respuesta a `chat.join`, al entrar y en cada reconexion: trae el historial. */
  | {
      name: 'chat.joined';
      ok: true;
      alias: string | null;
      canWrite: boolean;
      messages: ChatMessageWire[];
    }
  | { name: 'chat.joined'; ok: false; reason: string }
  | { name: 'chat.message'; message: ChatMessageWire };

export type ChatSendResult = { ok: true } | { ok: false; reason: string };

/**
 * Canal en vivo de las salas (HU-26, HU-27) y su chat.
 *
 * `joinRoom` y `joinChat` devuelven la funcion para dejar de escuchar. Varias pantallas
 * pueden escuchar la misma sala: la suscripcion al servidor se hace una vez y se suelta con
 * la ultima.
 */
export interface RealtimeChannel {
  joinRoom(roomId: string, listener: (event: RoomEvent) => void): () => void;
  joinChat(roomId: string, listener: (event: ChatEvent) => void): () => void;
  sendChat(roomId: string, text: string): Promise<ChatSendResult>;
}

/** Cuanto se espera la confirmacion de engagement al entrar al chat o al enviar. */
const CHAT_ACK_TIMEOUT_MS = 5_000;

const ROOM_EVENTS = [
  'round.price',
  'round.activated',
  'round.closed',
  'round.extended',
  'room.status',
  'round.mode',
  'round.sealed',
] as const;
const PERSONAL_EVENTS = ['bid.outbid', 'round.won'] as const;

/** Cuantos `eventId` se recuerdan para descartar reemisiones. */
const SEEN_WINDOW = 1_000;

interface Payload {
  eventId?: string;
  roomId?: string;
  roundId?: string;
  sequence?: string;
  status?: string;
  segment?: string | null;
  mode?: string | null;
  sealedCount?: number;
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
  const chatListeners = new Map<string, Set<(event: ChatEvent) => void>>();
  /** La ultima respuesta a `chat.join` de cada sala, para quien empieza a escuchar despues. */
  const chatJoined = new Map<string, ChatEvent>();
  const seen = new Set<string>();

  const dispatch = (roomId: string, event: RoomEvent) =>
    listeners.get(roomId)?.forEach((listener) => listener(event));

  const dispatchChat = (roomId: string, event: ChatEvent) =>
    chatListeners.get(roomId)?.forEach((listener) => listener(event));

  /** Entra al chat y reparte la respuesta (con el historial) a quien escucha esa sala. */
  async function enterChat(connection: Socket, roomId: string) {
    let event: ChatEvent;
    try {
      const response = await connection
        .timeout(CHAT_ACK_TIMEOUT_MS)
        .emitWithAck('chat.join', { roomId, token: getToken() });
      event = response?.ok
        ? {
            name: 'chat.joined',
            ok: true,
            alias: response.alias ?? null,
            canWrite: response.canWrite === true,
            messages: Array.isArray(response.messages) ? response.messages : [],
          }
        : {
            name: 'chat.joined',
            ok: false,
            reason: String(response?.reason ?? 'unavailable'),
          };
    } catch {
      event = { name: 'chat.joined', ok: false, reason: 'unavailable' };
    }
    // Pudo dejar de escucharse mientras se esperaba la respuesta.
    if (!chatListeners.has(roomId)) return;
    chatJoined.set(roomId, event);
    dispatchChat(roomId, event);
  }

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
    // pasaron mientras no habia conexion no se van a recibir. Cada `room.join` lleva el token
    // vigente: engagement lo usa para preguntarle a auction por la sala, y el del handshake
    // vence a los quince minutos aunque la conexion siga abierta.
    socket.on('connect', () => {
      for (const roomId of listeners.keys()) {
        socket?.emit('room.join', { roomId, token: getToken() });
        dispatch(roomId, { name: 'resync' });
      }
      // El chat tambien se vuelve a abrir: el historial trae lo que se perdio sin conexion.
      for (const roomId of chatListeners.keys()) {
        if (socket) void enterChat(socket, roomId);
      }
    });

    socket.on('chat.message', (payload: Partial<ChatMessageWire>) => {
      if (!payload?.roomId || !payload.id || typeof payload.body !== 'string')
        return;
      dispatchChat(payload.roomId, {
        name: 'chat.message',
        message: {
          id: payload.id,
          roomId: payload.roomId,
          alias: payload.alias ?? 'Participante',
          body: payload.body,
          createdAt: payload.createdAt ?? new Date().toISOString(),
        },
      });
    });

    for (const name of [...ROOM_EVENTS, ...PERSONAL_EVENTS]) {
      socket.on(name, (payload: Payload) => {
        if (!payload.roomId) return;
        if (name !== 'room.status' && !payload.roundId) return;
        // El mismo evento llega a la sala y al canal personal: se entrega una sola vez por
        // nombre, asi que la llave es nombre + eventId.
        if (!firstTime(payload.eventId && `${name}:${payload.eventId}`)) return;

        dispatch(payload.roomId, toRoomEvent(name, payload));
      });
    }

    return socket;
  }

  function toRoomEvent(
    name: (typeof ROOM_EVENTS)[number] | (typeof PERSONAL_EVENTS)[number],
    payload: Payload,
  ): RoomEvent {
    const roundId = payload.roundId ?? '';
    if (name === 'room.status') return { name, status: payload.status ?? '' };
    if (name === 'round.price')
      return { name, roundId, sequence: Number(payload.sequence ?? 0) };
    if (name === 'round.mode')
      return { name, roundId, segment: payload.segment ?? null, mode: payload.mode ?? null };
    if (name === 'round.sealed')
      return { name, roundId, sealedCount: Number(payload.sealedCount ?? 0) };
    return { name, roundId };
  }

  return {
    joinRoom(roomId, listener) {
      const connection = connect();
      let roomListeners = listeners.get(roomId);
      if (!roomListeners) {
        roomListeners = new Set();
        listeners.set(roomId, roomListeners);
        if (connection.connected)
          connection.emit('room.join', { roomId, token: getToken() });
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

    joinChat(roomId, listener) {
      const connection = connect();
      let roomListeners = chatListeners.get(roomId);
      if (!roomListeners) {
        roomListeners = new Set();
        chatListeners.set(roomId, roomListeners);
        // Sin conexion todavia, el `connect` se encarga de entrar.
        if (connection.connected) void enterChat(connection, roomId);
      } else {
        const joined = chatJoined.get(roomId);
        if (joined) listener(joined);
      }
      roomListeners.add(listener);

      return () => {
        const current = chatListeners.get(roomId);
        current?.delete(listener);
        if (current && current.size === 0) {
          chatListeners.delete(roomId);
          chatJoined.delete(roomId);
          socket?.emit('chat.leave', { roomId });
        }
      };
    },

    async sendChat(roomId, text) {
      const connection = connect();
      if (!connection.connected) return { ok: false, reason: 'unavailable' };
      try {
        const response = await connection
          .timeout(CHAT_ACK_TIMEOUT_MS)
          .emitWithAck('chat.send', { roomId, text, token: getToken() });
        return response?.ok
          ? { ok: true }
          : { ok: false, reason: String(response?.reason ?? 'unavailable') };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    },
  };
}

import { ITEM_CONDITION_LABELS } from '@/features/catalog/domain/item-condition';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import type {
  RoomDetail,
  RoomSummary as RoomListing,
  RoundDetail,
  RoundEntry,
} from '@/features/rooms/model/room';
import type { HttpClient } from '@/shared/api/http-client';
import { ApiError } from '@/shared/api/problem-details';
import { minimumBid } from '../domain/auction-rules';
import type {
  AppNotification,
  AuctionItem,
  AuctionItemStatus,
  LiveRoom,
  Room,
  RoomSummary,
  Round,
} from '../model/auction';
import type { AuctionGateway } from '../ports/auction.gateway';
import type { RealtimeChannel } from './realtime-channel';

/** Cada cuanto se relee la sala cuando no hay canal en vivo. */
const POLL_INTERVAL_MS = 2_000;

/** Con canal en vivo, un sondeo lento por si se pierde algun evento o la conexion. */
const FALLBACK_POLL_MS = 15_000;

/** Cuanto se reutiliza lo que catalog dijo de una entrada. */
const ENTRY_CACHE_MS = 5 * 60_000;

/** Lo que las pantallas enseñan de una entrada, sacado de catalog. */
interface EntryInfo {
  name: string;
  description: string;
  category: string;
  condition: string;
  imageUrl: string | null;
}

/**
 * Adaptador de subastas contra ecilost-auction-service, con catalog para lo descriptivo.
 *
 * Auction solo sabe `kind` y `catalogId` de cada ronda: el nombre, la descripcion y la foto
 * son de catalog, y aqui se juntan. Un `AuctionItem` es una ronda, y su id es
 * `roomId.roundId` para que la ficha encuentre su sala con una sola peticion (los UUID no
 * llevan puntos).
 *
 * Cubre descubrir salas, registrarse, la sala en vivo, la puja manual y el resumen al
 * cerrar (HU-15 a HU-21 y HU-28), con el canal en vivo y la bandeja de
 * ecilost-engagement-service (HU-26, HU-27). Compra inmediata y puja automatica fallan con
 * un 501
 * explicito en vez de fingir datos; "Mis pujas" y las notificaciones responden vacias
 * porque el servicio aun no las publica.
 */
export function createHttpAuctionGateway(deps: {
  http: HttpClient;
  items: ItemGateway;
  lots: LotGateway;
  /** Canal en vivo de engagement. Sin el, la sala se consulta cada pocos segundos. */
  realtime?: RealtimeChannel;
  /** API HTTP de engagement, para la bandeja de notificaciones. */
  engagement?: HttpClient;
}): AuctionGateway {
  const { http } = deps;
  const entryInfo = createEntryResolver(deps);

  const roomDetail = (id: string) => http.get<RoomDetail>(`/rooms/${id}`);

  async function toRoom(detail: RoomDetail): Promise<Room> {
    const infos = await Promise.all(
      detail.rounds.map((round) => entryInfo(round.entries[0])),
    );
    return {
      id: detail.id,
      name: detail.name,
      title: detail.name,
      status: detail.status === 'CANCELLED' ? 'CLOSED' : detail.status,
      startsAt: detail.startsAt,
      capacity: detail.maximumCapacity,
      admitted: detail.admittedCount,
      isParticipant: detail.isParticipant,
      rounds: detail.rounds.map((round, index) =>
        toRound(round, infos[index].name),
      ),
    };
  }

  async function toItems(detail: RoomDetail): Promise<AuctionItem[]> {
    return Promise.all(
      detail.rounds.map(async (round) =>
        toAuctionItem(detail, round, await entryInfo(round.entries[0])),
      ),
    );
  }

  /**
   * Lo que hay que pintar de una sala en curso. La hora del servidor sale de
   * `GET /rooms/:id/state`, que solo responde a quien participa; quien solo sigue la sala
   * usa su reloj, porque no puede pujar y un desfase no le cuesta nada.
   */
  async function live(roomId: string): Promise<LiveRoom> {
    const detail = await roomDetail(roomId);
    const serverTime = detail.isParticipant
      ? (await http.get<{ serverTime: string }>(`/rooms/${roomId}/state`))
          .serverTime
      : new Date().toISOString();
    const room = await toRoom(detail);

    return {
      room,
      round: room.rounds.find((round) => round.status === 'ACTIVE') ?? null,
      // El servicio no publica todavia el historial de pujas ni la actividad de la sala.
      bids: [],
      activity: [],
      autoBid: { enabled: false, limit: 0, stopped: false },
      participants: detail.admittedCount,
      serverTime,
    };
  }

  return {
    async items() {
      const rooms = await http.get<RoomListing[]>('/rooms');
      const details = await Promise.all(rooms.map((room) => roomDetail(room.id)));
      const items = await Promise.all(details.map(toItems));
      return items.flat();
    },

    async item(id: string) {
      const [roomId, roundId] = id.split('.');
      const detail = await roomDetail(roomId);
      const round = detail.rounds.find((candidate) => candidate.id === roundId);
      if (!round) throw notFound('Ese objeto no está en ninguna sala.');
      return toAuctionItem(detail, round, await entryInfo(round.entries[0]));
    },

    room: async (id: string) => toRoom(await roomDetail(id)),

    /**
     * `POST /rooms/:id/participants`. Es idempotente en el servicio: repetirlo no consume
     * otro cupo. Un 409 trae el motivo ("Sala completa.", "Sala cerrada.") y se deja pasar.
     */
    async joinRoom(id: string) {
      await http.post(`/rooms/${id}/participants`);
      return toRoom(await roomDetail(id));
    },

    liveRoom: (roomId: string) => live(roomId),

    /**
     * `POST /rounds/:id/bids` sobre la ronda activa. La ronda se busca en el momento: si
     * cambio entre que se pinto y se pujo, el servicio responde 409 y no se reserva nada.
     */
    async placeBid(roomId: string, amount: number) {
      const detail = await roomDetail(roomId);
      const active = detail.rounds.find((round) => round.status === 'ACTIVE');
      if (!active) throw conflict('No hay una ronda en curso en esta sala.');

      await http.post(`/rounds/${active.id}/bids`, { amount });
      return live(roomId);
    },

    buyNow: () => notConnected(),
    setAutoBid: () => notConnected(),
    /**
     * Lo que paso en cada ronda para quien consulta, a partir del resultado que auction
     * registra al cerrar: gano si la ronda se adjudico y lideraba; perdio si pujo y no
     * lideraba; y si no pujo, se dice si se vendio o quedo desierta.
     */
    async roomSummary(roomId: string): Promise<RoomSummary> {
      const detail = await roomDetail(roomId);
      const room = await toRoom(detail);

      const rows = detail.rounds.map((round, index) => {
        const price = Number(round.currentPrice);
        const mine = round.myHighestBid === null ? null : Number(round.myHighestBid);
        const won = round.result === 'AWARDED' && round.isLeading;
        const outcome = won ? 'WON' : mine !== null ? 'LOST' : 'NO_BID';
        const sold =
          round.result === 'DESERTED' ? 'quedó desierta' : `se vendió por ${price}`;

        return {
          itemId: round.entries[0].catalogId,
          itemName: room.rounds[index].itemName,
          position: round.position,
          outcome,
          amount: won ? price : mine,
          detail: `Objeto ${round.position} · ${
            won
              ? 'lo ganaste'
              : mine !== null
                ? `tu mejor puja fue superada; ${sold}`
                : sold
          }`,
        } as RoomSummary['rows'][number];
      });

      const closings = detail.rounds
        .map((round) => round.closedAt ?? round.endsAt)
        .filter((value): value is string => value !== null)
        .sort();

      return {
        roomId: detail.id,
        roomName: detail.name,
        items: detail.rounds.length,
        participants: detail.admittedCount,
        closedAt: closings.at(-1) ?? new Date().toISOString(),
        rows,
        totalSpent: rows
          .filter((row) => row.outcome === 'WON')
          .reduce((total, row) => total + (row.amount ?? 0), 0),
      };
    },

    /**
     * Cambios en vivo de la sala. Con canal (engagement), cada evento dispara una relectura;
     * sin canal, o si se cae, un sondeo lento mantiene la sala al dia.
     *
     * Concurrencia sin bloqueos:
     * - una sola lectura en vuelo por sala; los eventos que llegan mientras tanto se
     *   funden en UNA lectura mas al terminar (no una por evento);
     * - un precio con `sequence` menor o igual al ultimo visto de su ronda llego tarde y se
     *   descarta: lo que muestra la pantalla nunca retrocede;
     * - lo que se pinta es siempre el estado del servidor, nunca el evento aplicado a mano,
     *   asi que dos eventos cruzados no pueden dejar la sala en un estado que no existio.
     */
    subscribe(roomId, listener) {
      let stopped = false;
      const refresh = coalesce(async () => {
        try {
          const state = await live(roomId);
          if (!stopped) listener(state);
        } catch {
          // El siguiente evento, o el sondeo de respaldo, vuelve a intentarlo.
        }
      });

      const lastSequence = new Map<string, number>();
      const leave = deps.realtime?.joinRoom(roomId, (event) => {
        if (event.name === 'round.price') {
          if (event.sequence <= (lastSequence.get(event.roundId) ?? -1)) return;
          lastSequence.set(event.roundId, event.sequence);
        }
        void refresh();
      });

      const every = deps.realtime ? FALLBACK_POLL_MS : POLL_INTERVAL_MS;
      const timer = setInterval(() => void refresh(), every);

      return () => {
        stopped = true;
        clearInterval(timer);
        leave?.();
      };
    },

    myBids: () => Promise.resolve([]),

    /** La bandeja que engagement proyecta de los eventos de auction (HU-27, HU-29). */
    async notifications() {
      if (!deps.engagement) return [];
      const { items } = await deps.engagement.get<{ items: InboxNotification[] }>('/notifications');
      return items.map(toAppNotification);
    },

    async markNotificationsRead() {
      if (deps.engagement) await deps.engagement.post('/notifications/read');
    },
  };
}

/**
 * Nombre, descripcion y foto de cada entrada, pedidos a catalog y guardados unos minutos: la
 * sala en vivo se relee cada pocos segundos y no tiene sentido volver a pedir lo mismo. La
 * vida de la cache es menor que la de las URL firmadas de las fotos (quince minutos), para
 * no servirlas caducadas. Si catalog no responde, la sala se sigue viendo con un texto
 * neutro en vez de romperse, y ese texto no se guarda.
 */
function createEntryResolver({
  items,
  lots,
}: {
  items: ItemGateway;
  lots: LotGateway;
}) {
  const cache = new Map<string, { at: number; info: Promise<EntryInfo> }>();

  async function resolve(entry: RoundEntry): Promise<EntryInfo> {
    try {
      if (entry.kind === 'ITEM') {
        const item = await items.findById(entry.catalogId);
        return {
          name: item.name,
          description: item.description,
          category: item.category,
          condition: ITEM_CONDITION_LABELS[item.condition],
          imageUrl: item.photos[0]?.url ?? null,
        };
      }

      const lot = await lots.findById(entry.catalogId);
      return {
        name: lot.name,
        description: `Lote con ${lot.items.map((item) => item.name).join(', ')}.`,
        category: 'Lote',
        condition: `${lot.items.length} objetos`,
        imageUrl: null,
      };
    } catch {
      cache.delete(`${entry.kind}:${entry.catalogId}`);
      return {
        name: entry.kind === 'ITEM' ? 'Objeto del catálogo' : 'Lote del catálogo',
        description: 'No se pudo cargar la descripción.',
        category: '—',
        condition: '—',
        imageUrl: null,
      };
    }
  }

  return (entry: RoundEntry): Promise<EntryInfo> => {
    const key = `${entry.kind}:${entry.catalogId}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < ENTRY_CACHE_MS) return cached.info;

    const info = resolve(entry);
    cache.set(key, { at: Date.now(), info });
    return info;
  };
}

function toRound(round: RoundDetail, itemName: string): Round {
  const entry = round.entries[0];
  return {
    id: round.id,
    position: round.position,
    itemId: entry.catalogId,
    itemName,
    status: round.status,
    basePrice: Number(round.startingPrice),
    currentPrice: Number(round.currentPrice),
    minimumBid: minimumBid({
      startingPrice: Number(round.startingPrice),
      currentPrice: Number(round.currentPrice),
      hasBids: round.hasBids,
    }),
    // El servicio no publica quien lidera, solo si es quien consulta.
    currentBidderId: null,
    startedAt: round.startedAt,
    endsAt: round.endsAt,
    maximumEndsAt: round.maximumEndsAt,
    buyNowPrice: null,
    leading: round.isLeading,
    myHighestBid:
      round.myHighestBid === null ? null : Number(round.myHighestBid),
    wonByMe: round.status === 'CLOSED' && round.isLeading,
  };
}

function toAuctionItem(
  room: RoomDetail,
  round: RoundDetail,
  info: EntryInfo,
): AuctionItem {
  const startingPrice = Number(round.startingPrice);
  const currentPrice = Number(round.currentPrice);

  return {
    id: `${room.id}.${round.id}`,
    ...info,
    roomId: room.id,
    roomName: room.name,
    position: round.position,
    roomSize: room.rounds.length,
    status: itemStatus(room, round),
    currentPrice,
    nextBid: minimumBid({ startingPrice, currentPrice, hasBids: round.hasBids }),
    buyNowPrice: null,
    startsAt: room.startsAt,
    endsAt: round.endsAt,
    roundStartedAt: round.startedAt,
    awarded: round.status === 'CLOSED' && round.hasBids,
  };
}

function itemStatus(room: RoomDetail, round: RoundDetail): AuctionItemStatus {
  if (room.status === 'CLOSED' || room.status === 'CANCELLED') return 'CLOSED';
  if (round.status === 'CLOSED') return 'CLOSED';
  if (round.status === 'ACTIVE') return 'LIVE';
  return 'UPCOMING';
}

function conflict(detail: string): ApiError {
  return new ApiError({
    type: '/problems/conflicto',
    title: 'Conflict',
    status: 409,
    detail,
  });
}

function notFound(detail: string): ApiError {
  return new ApiError({
    type: '/problems/objeto-no-encontrado',
    title: 'El recurso no existe',
    status: 404,
    detail,
  });
}

function notConnected(): Promise<never> {
  return Promise.reject(
    new ApiError({
      type: '/problems/no-disponible',
      title: 'Todavía no disponible',
      status: 501,
      detail:
        'La compra inmediata y la puja automática todavía no están conectadas con el servicio de subastas.',
    }),
  );
}

/**
 * Una lectura a la vez; lo que se pide mientras corre se funde en una sola lectura mas.
 * Es la version sin bloqueos de "no leas dos veces lo mismo al mismo tiempo".
 */
function coalesce(task: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let again = false;

  const run = async (): Promise<void> => {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await task();
      } while (again);
    })();
    try {
      await running;
    } finally {
      running = null;
    }
  };

  return run;
}

/** Una notificacion tal como la guarda engagement. */
interface InboxNotification {
  id: string;
  kind: 'OUTBID' | 'ROUND_CLOSED' | 'ROUND_WON';
  roomId: string;
  payload: { position?: number; currentPrice?: string };
  createdAt: string;
  readAt: string | null;
}

function toAppNotification(entry: InboxNotification): AppNotification {
  const price = Number(entry.payload.currentPrice ?? 0).toLocaleString('es-CO');
  const item = entry.payload.position ? `el objeto ${entry.payload.position}` : 'la ronda';
  const base = { id: entry.id, at: entry.createdAt, read: entry.readAt !== null, roomId: entry.roomId };

  if (entry.kind === 'ROUND_WON') {
    return { ...base, kind: 'WON', title: '¡Ganaste este objeto!', body: `Ganaste ${item} por ${price} ECICoin.` };
  }
  if (entry.kind === 'OUTBID') {
    return { ...base, kind: 'OUTBID', title: '¡Te superaron!', body: `Alguien pujó ${price} ECICoin en ${item}.` };
  }
  return { ...base, kind: 'ROOM_CLOSED', title: 'La ronda cerró', body: `Se cerró ${item} en ${price} ECICoin.` };
}

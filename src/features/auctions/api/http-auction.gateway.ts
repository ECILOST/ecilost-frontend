import { ITEM_CONDITION_LABELS } from '@/features/catalog/domain/item-condition';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import type {
  RoomDetail,
  RoomSummary,
  RoundDetail,
  RoundEntry,
} from '@/features/rooms/model/room';
import type { HttpClient } from '@/shared/api/http-client';
import { ApiError } from '@/shared/api/problem-details';
import { minimumBid } from '../domain/auction-rules';
import type {
  AuctionItem,
  AuctionItemStatus,
  LiveRoom,
  Room,
  Round,
} from '../model/auction';
import type { AuctionGateway } from '../ports/auction.gateway';

/** Cada cuanto se relee la sala mientras no exista el canal en vivo. */
const POLL_INTERVAL_MS = 2_000;

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
 * Cubre descubrir salas, registrarse, la sala en vivo y la puja manual (HU-15 a HU-21).
 * Mientras no se conecte el canal de ecilost-engagement-service, `subscribe` consulta la
 * sala cada pocos segundos. Compra inmediata, puja automatica y el resumen fallan con un 501
 * explicito en vez de fingir datos; "Mis pujas" y las notificaciones responden vacias
 * porque el servicio aun no las publica.
 */
export function createHttpAuctionGateway(deps: {
  http: HttpClient;
  items: ItemGateway;
  lots: LotGateway;
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
      const rooms = await http.get<RoomSummary[]>('/rooms');
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
    roomSummary: () => notConnected(),

    /**
     * Sondeo de la sala hasta que exista el canal en vivo de engagement. Un fallo puntual no
     * corta la escucha: el siguiente intento vuelve a partir del estado del servidor.
     */
    subscribe(roomId, listener) {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout>;

      const tick = async () => {
        try {
          const state = await live(roomId);
          if (!stopped) listener(state);
        } catch {
          // Se reintenta en el siguiente ciclo.
        } finally {
          if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      };
      timer = setTimeout(tick, POLL_INTERVAL_MS);

      return () => {
        stopped = true;
        clearTimeout(timer);
      };
    },
    myBids: () => Promise.resolve([]),
    notifications: () => Promise.resolve([]),
    markNotificationsRead: () => Promise.resolve(),
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
        'La compra inmediata, la puja automática y el resumen de la sala todavía no están conectados con el servicio de subastas.',
    }),
  );
}

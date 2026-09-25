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
import { minimumServiceBid } from '../domain/auction-rules';
import type {
  AuctionItem,
  AuctionItemStatus,
  Room,
  Round,
} from '../model/auction';
import type { AuctionGateway } from '../ports/auction.gateway';

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
 * Cubre descubrir salas y registrarse (HU-15 a HU-17). La sala en vivo, las pujas y el canal
 * de tiempo real todavia no estan conectados: esas operaciones fallan con un 501 explicito
 * en vez de fingir datos, y "Mis pujas" y las notificaciones responden vacias porque el
 * servicio aun no las publica.
 */
export function createHttpAuctionGateway(deps: {
  http: HttpClient;
  items: ItemGateway;
  lots: LotGateway;
}): AuctionGateway {
  const { http } = deps;
  // Un resolvedor por operacion y no uno para toda la sesion: las fotos de catalog van en
  // URL firmadas que caducan a los quince minutos, y una cache larga las serviria rotas.
  const resolver = () => createEntryResolver(deps);

  const roomDetail = (id: string) => http.get<RoomDetail>(`/rooms/${id}`);

  async function toRoom(detail: RoomDetail): Promise<Room> {
    const entryInfo = resolver();
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

  async function toItems(
    detail: RoomDetail,
    entryInfo: ReturnType<typeof resolver>,
  ): Promise<AuctionItem[]> {
    return Promise.all(
      detail.rounds.map(async (round) =>
        toAuctionItem(detail, round, await entryInfo(round.entries[0])),
      ),
    );
  }

  return {
    async items() {
      const rooms = await http.get<RoomSummary[]>('/rooms');
      const details = await Promise.all(rooms.map((room) => roomDetail(room.id)));
      const entryInfo = resolver();
      const items = await Promise.all(
        details.map((detail) => toItems(detail, entryInfo)),
      );
      return items.flat();
    },

    async item(id: string) {
      const [roomId, roundId] = id.split('.');
      const detail = await roomDetail(roomId);
      const round = detail.rounds.find((candidate) => candidate.id === roundId);
      if (!round) throw notFound('Ese objeto no está en ninguna sala.');
      return toAuctionItem(detail, round, await resolver()(round.entries[0]));
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

    liveRoom: () => notConnected(),
    placeBid: () => notConnected(),
    buyNow: () => notConnected(),
    setAutoBid: () => notConnected(),
    roomSummary: () => notConnected(),
    // Sin canal todavia: nadie avisa de cambios, y dejar de escuchar no tiene nada que cerrar.
    subscribe: () => () => undefined,
    myBids: () => Promise.resolve([]),
    notifications: () => Promise.resolve([]),
    markNotificationsRead: () => Promise.resolve(),
  };
}

/**
 * Nombre, descripcion y foto de cada entrada, pedidos a catalog una sola vez por operacion:
 * un lote que aparece en dos salas no se pide dos veces. Si catalog no responde, la sala se
 * sigue viendo con un texto neutro en vez de romperse.
 */
function createEntryResolver({
  items,
  lots,
}: {
  items: ItemGateway;
  lots: LotGateway;
}) {
  const cache = new Map<string, Promise<EntryInfo>>();

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
    if (cached) return cached;

    const info = resolve(entry);
    cache.set(key, info);
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
    // El servicio no publica quien lidera, solo si es quien consulta.
    currentBidderId: null,
    startedAt: round.startedAt,
    endsAt: round.endsAt,
    maximumEndsAt: round.maximumEndsAt,
    buyNowPrice: null,
    leading: round.isLeading,
    myHighestBid: null,
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
    nextBid: minimumServiceBid({ startingPrice, currentPrice, hasBids: round.hasBids }),
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
        'La sala en vivo y las pujas todavía no están conectadas con el servicio de subastas.',
    }),
  );
}

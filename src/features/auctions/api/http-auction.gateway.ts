import {
  ITEM_CONDITION_LABELS,
  type ItemCondition,
} from '@/features/catalog/domain/item-condition';
import type { MysteryEntry as CatalogMysteryEntry } from '@/features/catalog/model/item';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import type { Lot } from '@/features/lots/model/lot';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import type {
  AutoBidDetail,
  RoomDetail,
  RoomStateDetail,
  RoomSummary as RoomListing,
  RoundDetail,
  RoundEntry,
  SealedResultsDetail,
} from '@/features/rooms/model/room';
import type { HttpClient } from '@/shared/api/http-client';
import { ApiError } from '@/shared/api/problem-details';
import { recordServerTime } from '@/shared/api/server-clock';
import { isSignedUrlFresh } from '@/shared/api/signed-url';
import { minimumBid } from '../domain/auction-rules';
import {
  CHAT_CONNECTING,
  ChatSendError,
  chatUnavailableReason,
  mergeChatMessages,
} from '../domain/room-chat';
import { publicTotals } from '../domain/room-results';
import type {
  AppNotification,
  AutoBid,
  AuctionItem,
  AuctionItemStatus,
  ChatMessage,
  DutchSchedule,
  LiveRoom,
  MyBid,
  Room,
  RoomChat,
  RoomSummary,
  Round,
  MysteryEntry,
  SealedResults,
} from '../model/auction';
import type { AuctionGateway } from '../ports/auction.gateway';
import type { ChatMessageWire, RealtimeChannel } from './realtime-channel';
import { type RoomActivityWire, toRoomActivity } from './room-activity';

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
 * cerrar (HU-15 a HU-21 y HU-28), la puja automatica (HU-22), con el canal en vivo y la
 * bandeja de ecilost-engagement-service (HU-26, HU-27), y "Mis pujas". La compra inmediata
 * falla con un 501 explicito en vez de fingir datos.
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

  /*
   * Lote misterioso (subastas dinamicas): catalog oculta el objeto a quien no lo gano, asi
   * que ni se le pide. En su lugar se piden las pistas de la ronda, que cambian poco: se
   * reutilizan un rato para no pedirlas en cada evento en vivo.
   */
  const clueCache = new Map<string, { at: number; entries: Promise<MysteryEntry[]> }>();
  const cluesFor = (roundId: string): Promise<MysteryEntry[]> => {
    const cached = clueCache.get(roundId);
    if (cached && Date.now() - cached.at < CLUE_CACHE_MS) return cached.entries;
    const entries = deps.items
      .mysteryClues(roundId)
      .then(({ entries }) => entries.map(toMysteryEntry))
      .catch(() => {
        clueCache.delete(roundId);
        return [] as MysteryEntry[];
      });
    clueCache.set(roundId, { at: Date.now(), entries });
    return entries;
  };
  const roundInfo = (round: RoundDetail): Promise<EntryInfo> =>
    hidesItem(round) ? Promise.resolve(MYSTERY_INFO) : entryInfo(round.entries[0]);
  const visibleEntries = (rounds: RoundDetail[]) =>
    rounds.filter((round) => !hidesItem(round)).map((round) => round.entries[0]);

  // Cada respuesta que trae la hora del servidor ajusta el reloj de las cuentas atras.
  const roomDetail = async (id: string) => {
    const detail = await http.get<RoomDetail>(`/rooms/${id}`);
    recordServerTime(detail.serverTime);
    return detail;
  };

  /**
   * Una sala cerrada o cancelada ya no cambia: ni rondas, ni precios, ni lo que hizo quien
   * consulta. El listado se relee cada quince segundos y antes volvia a pedir el detalle de
   * todas las salas que alguna vez existieron; las terminadas se piden una sola vez. Iniciar
   * sesion recarga la pagina, asi que esta memoria no cruza de una persona a otra.
   */
  const finishedDetails = new Map<string, RoomDetail>();
  const detailFor = async (listing: RoomListing) => {
    const known = finishedDetails.get(listing.id);
    if (known) return known;
    const detail = await roomDetail(listing.id);
    if (detail.status === 'CLOSED' || detail.status === 'CANCELLED') {
      finishedDetails.set(listing.id, detail);
    }
    return detail;
  };

  /**
   * El detalle de todas las salas del listado con dos peticiones, no una por sala: el
   * listado dice cuales hay, y `?include=rounds&status=SCHEDULED,ACTIVE` trae las abiertas
   * con sus rondas. Las terminadas salen de `finishedDetails`, o se piden una sola vez.
   *
   * Si auction todavia no conoce `include`, responde salas sin `rounds` y se vuelve a pedir
   * sala por sala, como antes: el front puede desplegarse antes que el servicio.
   */
  async function detailsOf(listings: RoomListing[]): Promise<RoomDetail[]> {
    const open = new Map<string, RoomDetail>();
    const anyOpen = listings.some(
      (listing) =>
        listing.status === 'SCHEDULED' || listing.status === 'ACTIVE',
    );
    if (anyOpen) {
      const batch = await http.get<Array<RoomDetail | RoomListing>>('/rooms', {
        query: { include: 'rounds', status: 'SCHEDULED,ACTIVE' },
      });
      const withRounds = batch.filter((room): room is RoomDetail =>
        Array.isArray((room as RoomDetail).rounds),
      );
      if (withRounds.length === batch.length) {
        recordServerTime(withRounds[0]?.serverTime);
        for (const detail of withRounds) open.set(detail.id, detail);
      }
    }
    // Una sala que se abrio o cerro entre las dos lecturas no viene en el lote: se pide sola.
    const details = await Promise.all(
      listings.map((listing) => open.get(listing.id) ?? detailFor(listing)),
    );
    await entryInfo.prefetch(
      details.flatMap((detail) => visibleEntries(detail.rounds)),
    );
    return details;
  }

  async function toRoom(detail: RoomDetail): Promise<Room> {
    await entryInfo.prefetch(visibleEntries(detail.rounds));
    const [infos, clues] = await Promise.all([
      Promise.all(detail.rounds.map(roundInfo)),
      Promise.all(
        detail.rounds.map((round) =>
          hidesItem(round) ? cluesFor(round.id) : Promise.resolve(null),
        ),
      ),
    ]);
    return {
      id: detail.id,
      name: detail.name,
      title: detail.name,
      status: detail.status === 'CANCELLED' ? 'CLOSED' : detail.status,
      startsAt: detail.startsAt,
      capacity: detail.maximumCapacity,
      admitted: detail.admittedCount,
      isParticipant: detail.isParticipant,
      isOwner: detail.isOwner ?? false,
      dynamicModesEnabled: detail.dynamicModesEnabled ?? false,
      rounds: detail.rounds.map((round, index) =>
        toRound(round, infos[index], clues[index]),
      ),
      serverTime: detail.serverTime,
    };
  }

  async function toItems(detail: RoomDetail): Promise<AuctionItem[]> {
    return Promise.all(
      detail.rounds.map(async (round) =>
        toAuctionItem(detail, round, await roundInfo(round)),
      ),
    );
  }

  /**
   * Lo que hay que pintar de una sala en curso. La hora del servidor y la puja automatica
   * salen de `GET /rooms/:id/state`, que solo responde a quien participa; quien solo sigue
   * la sala toma la hora que trae la sala misma. El reloj local nunca decide nada.
   */
  /**
   * Actividad publica de la sala en engagement (pujas sin autor, inicio y cierre de rondas).
   * Es un adorno de la sala, no su estado: si engagement no responde, la sala se pinta igual
   * sin ella.
   */
  async function activityOf(roomId: string): Promise<RoomActivityWire[]> {
    if (!deps.engagement) return [];
    try {
      const { items } = await deps.engagement.get<{ items: RoomActivityWire[] }>(
        `/rooms/${roomId}/activity`,
      );
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  async function live(roomId: string): Promise<LiveRoom> {
    const detail = await roomDetail(roomId);
    // El dueño tambien lee el estado: sigue su sala en vivo, aunque no puje.
    const [state, publicActivity] = await Promise.all([
      detail.isParticipant || detail.isOwner
        ? http.get<RoomStateDetail>(`/rooms/${roomId}/state`)
        : Promise.resolve(null),
      activityOf(roomId),
    ]);
    recordServerTime(state?.serverTime);
    const serverTime =
      state?.serverTime ?? detail.serverTime ?? new Date().toISOString();
    const room = await toRoom(detail);
    const { bids, activity } = toRoomActivity(publicActivity, room);

    return {
      room,
      round: room.rounds.find((round) => round.status === 'ACTIVE') ?? null,
      bids,
      activity,
      autoBid: toAutoBid(state?.autoBid ?? null),
      participants: detail.admittedCount,
      serverTime,
    };
  }

  return {
    async items() {
      const rooms = await http.get<RoomListing[]>('/rooms');
      const details = await detailsOf(rooms);
      const items = await Promise.all(details.map(toItems));
      return items.flat();
    },

    async item(id: string) {
      const [roomId, roundId] = id.split('.');
      const detail = await roomDetail(roomId);
      const round = detail.rounds.find((candidate) => candidate.id === roundId);
      if (!round) throw notFound('Ese objeto no está en ninguna sala.');
      return toAuctionItem(detail, round, await roundInfo(round));
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
     * `POST /rounds/:id/bids` sobre la ronda que se estaba viendo (HU-25). Antes se buscaba
     * la ronda activa al confirmar: si alguien compraba el objeto en ese instante, la puja
     * caia en el siguiente. Con la ronda vista, el servicio la rechaza con 409.
     */
    async placeBid(roomId: string, roundId: string, amount: number) {
      await http.post(`/rounds/${roundId}/bids`, { amount });
      return live(roomId);
    },

    async buyNow(roomId: string, roundId: string) {
      // Sin cuerpo: el precio, el comprador y si la ronda sigue abierta los decide el servicio.
      await http.post(`/rounds/${roundId}/buy-now`);
      return live(roomId);
    },

    /**
     * `PUT /rounds/:id/auto-bid` sobre la ronda que se estaba viendo (HU-22, HU-25). El
     * servicio valida el limite contra la puja minima y el saldo, y rechaza una ronda que ya
     * no esta activa; si no alcanza responde 409 y no se guarda nada.
     */
    async setAutoBid(
      roomId: string,
      roundId: string,
      config: { enabled: boolean; limit: number },
    ) {
      await http.put(
        `/rounds/${roundId}/auto-bid`,
        config.enabled
          ? { enabled: true, maximumAmount: config.limit }
          : { enabled: false },
      );
      return live(roomId);
    },

    /**
     * Subastas dinamicas, holandesa: "Lo quiero". Sin cuerpo: el precio es el que diga el
     * reloj del servidor al cerrar, nunca el que se pinto aqui.
     */
    async dutchClaim(roomId: string, roundId: string) {
      await http.post(`/rounds/${roundId}/dutch-claim`);
      return live(roomId);
    },

    /** Subastas dinamicas, sobre cerrado: la unica puja de quien mira, a ciegas. */
    async sealBid(roomId: string, roundId: string, amount: number) {
      await http.post(`/rounds/${roundId}/sealed-bid`, { amount });
      return live(roomId);
    },

    /** Apertura de sobres de una ronda de sobre cerrado que ya cerro. */
    async sealedResults(roundId: string): Promise<SealedResults> {
      const results = await http.get<SealedResultsDetail>(
        `/rounds/${roundId}/sealed-results`,
      );
      return {
        ...results,
        ranking: results.ranking.map((row) => ({ ...row, amount: Number(row.amount) })),
      };
    },
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
          imageUrl: room.rounds[index].imageUrl,
          position: round.position,
          outcome,
          amount: won ? price : mine,
          result: round.result,
          finalPrice: price,
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
        ...publicTotals(rows),
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

    /**
     * Chat de la sala por el canal de engagement. Sin canal no hay chat: no se sondea, porque
     * un chat que llega cada quince segundos no es un chat.
     */
    subscribeChat(roomId, listener) {
      if (!deps.realtime) {
        listener({
          ...CHAT_CONNECTING,
          status: 'unavailable',
          reason: 'unavailable',
        });
        return () => undefined;
      }

      let chat: RoomChat = CHAT_CONNECTING;
      listener(chat);
      const toMessage = (wire: ChatMessageWire): ChatMessage => ({
        id: wire.id,
        alias: wire.alias,
        body: wire.body,
        at: wire.createdAt,
        mine: chat.alias !== null && wire.alias === chat.alias,
      });

      return deps.realtime.joinChat(roomId, (event) => {
        if (event.name === 'chat.message') {
          chat = {
            ...chat,
            messages: mergeChatMessages(chat.messages, [
              toMessage(event.message),
            ]),
          };
        } else if (event.ok) {
          chat = {
            ...chat,
            status: 'ready',
            canWrite: event.canWrite,
            alias: event.alias,
            reason: undefined,
          };
          chat = {
            ...chat,
            messages: mergeChatMessages(
              chat.messages,
              event.messages.map(toMessage),
            ),
          };
        } else {
          chat = {
            ...chat,
            status: 'unavailable',
            canWrite: false,
            reason: chatUnavailableReason(event.reason),
          };
        }
        listener(chat);
      });
    },

    async sendChatMessage(roomId, text) {
      if (!deps.realtime) throw new ChatSendError('unavailable');
      const result = await deps.realtime.sendChat(roomId, text);
      if (!result.ok) throw new ChatSendError(result.reason);
    },

    /**
     * Mis pujas: las rondas donde puje, sacadas de las salas en las que participo. El estado
     * sale del mismo detalle que ve la sala (lidero o no, resultado al cerrar), asi que "Mis
     * pujas" y la sala nunca se contradicen.
     */
    async myBids() {
      const rooms = await http.get<RoomListing[]>('/rooms');
      const details = await detailsOf(
        rooms.filter((room) => room.isParticipant),
      );

      const bids = details.flatMap((detail) =>
        detail.rounds
          .filter((round) => round.myHighestBid !== null)
          .map(async (round): Promise<MyBid> => {
            const info = await roundInfo(round);
            const price = Number(round.currentPrice);
            const mine = Number(round.myHighestBid);
            const closed = round.status === 'CLOSED';
            const status: MyBid['status'] = closed
              ? round.result === 'AWARDED' && round.isLeading ? 'WON' : 'LOST'
              : round.isLeading ? 'WINNING' : 'OUTBID';

            return {
              id: `${detail.id}.${round.id}`,
              itemId: `${detail.id}.${round.id}`,
              itemName: info.name,
              imageUrl: info.imageUrl,
              roomId: detail.id,
              detail: `${detail.name} · Objeto ${round.position} de ${detail.rounds.length} · ${closed ? 'finalizado' : 'en curso'}`,
              amount: status === 'WON' ? price : mine,
              status,
              outbidBy: status === 'OUTBID' ? price - mine : null,
              // La puja automatica no esta conectada con el servicio.
              autoBidLimit: null,
            };
          }),
      );
      return Promise.all(bids);
    },

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
 * sala en vivo se relee cada pocos segundos y no tiene sentido volver a pedir lo mismo. Una
 * entrada se vuelve a pedir si su foto esta por caducar (ver `isSignedUrlFresh`). Si catalog
 * no responde, la sala se sigue viendo con un texto neutro en vez de romperse, y ese texto
 * no se guarda.
 *
 * `prefetch` llena la cache de muchas entradas con una peticion por tipo
 * (`GET /items?ids=`, `GET /lots?ids=`) en vez de una por entrada. Si catalog todavia no
 * admite `ids`, no pasa nada: cada entrada se resuelve una por una como antes.
 */
function createEntryResolver({
  items,
  lots,
}: {
  items: ItemGateway;
  lots: LotGateway;
}) {
  const cache = new Map<
    string,
    { at: number; info: Promise<EntryInfo>; imageUrl: string | null }
  >();
  const keyOf = (entry: RoundEntry) => `${entry.kind}:${entry.catalogId}`;

  function isFresh(key: string): boolean {
    const cached = cache.get(key);
    // La foto puede caducar antes que la entrada: catalog reutiliza la firma mientras le
    // queda vida, asi que el enlace recibido ya puede traer minutos gastados. Servirlo
    // vencido hacia desaparecer la imagen al volver a montar la tarjeta.
    return Boolean(
      cached &&
      Date.now() - cached.at < ENTRY_CACHE_MS &&
      isSignedUrlFresh(cached.imageUrl),
    );
  }

  function store(key: string, info: Promise<EntryInfo>): Promise<EntryInfo> {
    const slot = { at: Date.now(), info, imageUrl: null as string | null };
    cache.set(key, slot);
    void info.then((value) => {
      slot.imageUrl = value.imageUrl;
    });
    return info;
  }

  const fromItem = (
    item: {
      name: string;
      description: string;
      category: string;
      condition: ItemCondition;
    },
    imageUrl: string | null,
  ): EntryInfo => ({
    name: item.name,
    description: item.description,
    category: item.category,
    condition: ITEM_CONDITION_LABELS[item.condition],
    imageUrl,
  });

  const fromLot = (lot: Lot): EntryInfo => ({
    name: lot.name,
    description: `Lote con ${lot.items.map((item) => item.name).join(', ')}.`,
    category: 'Lote',
    condition: `${lot.items.length} objetos`,
    // La portada del lote (su primera fotografia), o el marcador si todavia no tiene. Un
    // catalog anterior a las fotos de lote no manda `coverUrl`: tambien cae en el marcador.
    imageUrl: lot.coverUrl ?? null,
  });

  async function resolve(entry: RoundEntry): Promise<EntryInfo> {
    try {
      if (entry.kind === 'ITEM') {
        const item = await items.findById(entry.catalogId);
        return fromItem(item, item.photos[0]?.url ?? null);
      }
      return fromLot(await lots.findById(entry.catalogId));
    } catch {
      cache.delete(keyOf(entry));
      return {
        name: entry.kind === 'ITEM' ? 'Objeto del catálogo' : 'Lote del catálogo',
        description: 'No se pudo cargar la descripción.',
        category: '—',
        condition: '—',
        imageUrl: null,
      };
    }
  }

  async function prefetch(entries: RoundEntry[]): Promise<void> {
    const missing = (kind: RoundEntry['kind']) => [
      ...new Set(
        entries
          .filter((entry) => entry.kind === kind && !isFresh(keyOf(entry)))
          .map((entry) => entry.catalogId),
      ),
    ];
    const itemIds = missing('ITEM');
    const lotIds = missing('LOT');

    await Promise.all([
      ...chunks(itemIds, IDS_PER_REQUEST).map(async (ids) => {
        try {
          for (const item of await items.list({ ids, limit: ids.length })) {
            store(
              `ITEM:${item.id}`,
              Promise.resolve(fromItem(item, item.coverUrl)),
            );
          }
        } catch {
          // Catalog sin `ids`, o caido: cada entrada se resolvera una por una.
        }
      }),
      ...chunks(lotIds, IDS_PER_REQUEST).map(async (ids) => {
        try {
          const wanted = new Set(ids);
          // Un catalog que no conoce `ids` devuelve todos los lotes: se toman los pedidos.
          for (const lot of await lots.list(ids)) {
            if (wanted.has(lot.id))
              store(`LOT:${lot.id}`, Promise.resolve(fromLot(lot)));
          }
        } catch {
          // Igual que arriba.
        }
      }),
    ]);
  }

  const resolveEntry = (entry: RoundEntry): Promise<EntryInfo> => {
    const key = keyOf(entry);
    if (isFresh(key)) return cache.get(key)!.info;
    return store(key, resolve(entry));
  };

  return Object.assign(resolveEntry, { prefetch });
}

/** Tope de ids por peticion: el mismo `MAX_PAGE_SIZE` de catalog. */
const IDS_PER_REQUEST = 200;

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function toAutoBid(detail: AutoBidDetail | null): AutoBid {
  if (!detail) return { enabled: false, limit: 0, stopped: false, stoppedReason: null };
  return {
    enabled: detail.enabled,
    limit: detail.maximumAmount === null ? 0 : Number(detail.maximumAmount),
    stopped: detail.stopped,
    stoppedReason: detail.stoppedReason,
  };
}

/** Cuanto se reutilizan las pistas de una ronda misteriosa. */
const CLUE_CACHE_MS = 60_000;

/** Lo que se pinta de una ronda misteriosa en lugar del objeto que catalog oculta. */
const MYSTERY_INFO: EntryInfo = {
  name: 'Lote misterioso',
  description: 'Solo se conocen sus pistas: el objeto se revela a quien lo gane.',
  category: 'Misterio',
  condition: '—',
  imageUrl: null,
};

/**
 * Catalog oculta el objeto de un lote misterioso a quien no lo gano. Quien lo gano si lo ve:
 * es justo a quien se le revela.
 */
function hidesItem(round: RoundDetail): boolean {
  return round.mode === 'MYSTERY' && !(round.status === 'CLOSED' && round.isLeading);
}

function toMysteryEntry(entry: CatalogMysteryEntry): MysteryEntry {
  return entry.kind === 'ITEM'
    ? { ...entry, condition: ITEM_CONDITION_LABELS[entry.condition] }
    : entry;
}

function toDutchSchedule(round: RoundDetail): DutchSchedule | null {
  if (!round.dutch) return null;
  return {
    startPrice: Number(round.dutch.startPrice),
    floorPrice: Number(round.dutch.floorPrice),
    step: Number(round.dutch.step),
    intervalSeconds: round.dutch.intervalSeconds,
  };
}

function toRound(round: RoundDetail, info: EntryInfo, clues: MysteryEntry[] | null = null): Round {
  const entry = round.entries[0];
  const mode = round.mode ?? 'CLASSIC';
  return {
    mode,
    modeLocked: round.modeLocked ?? false,
    wildcardSpins: round.wildcardSpins ?? 0,
    dutch: toDutchSchedule(round),
    sealed: round.sealed
      ? {
          count: round.sealed.count,
          mine: round.sealed.mine ? Number(round.sealed.mine.amount) : null,
        }
      : null,
    mystery: clues ? { entries: clues } : null,
    id: round.id,
    position: round.position,
    itemId: entry.catalogId,
    itemName: info.name,
    imageUrl: info.imageUrl,
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
    buyNowPrice: toBuyNowPrice(round),
    leading: round.isLeading,
    myHighestBid:
      round.myHighestBid === null ? null : Number(round.myHighestBid),
    wonByMe: round.status === 'CLOSED' && round.isLeading,
    closeReason: round.closeReason ?? null,
    result: round.status === 'CLOSED' ? (round.result ?? null) : null,
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
    buyNowPrice: toBuyNowPrice(round),
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

/** Decimal como texto, o nada si la ronda no ofrece compra inmediata (HU-24). */
function toBuyNowPrice(round: RoundDetail): number | null {
  return round.buyNowPrice == null ? null : Number(round.buyNowPrice);
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

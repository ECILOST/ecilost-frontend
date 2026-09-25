import { ApiError, ProblemType } from '@/shared/api/problem-details';
import { BID_INCREMENT, minimumBid, nextBidFor } from '../domain/auction-rules';
import type {
  AppNotification,
  AuctionItem,
  AutoBid,
  Bid,
  LiveRoom,
  MyBid,
  NotificationKind,
  Room,
  RoomActivity,
  RoomStatus,
  RoomSummary,
  Round,
  RoundStatus,
} from '../model/auction';
import type { AuctionGateway } from '../ports/auction.gateway';

/*
 * Adaptador de DEMOSTRACION: salas, rondas y pujas en memoria, con rivales simulados.
 *
 * Existe para que las pantallas del diseño funcionen de punta a punta mientras se conecta
 * el front con ecilost-auction-service y ecilost-engagement-service. Imita sus reglas para
 * que el cambio de adaptador no cambie comportamientos:
 * - la ronda dura 3 minutos y como mucho 8 (`ROUND_DURATION_MS` / `MAX_ROUND_DURATION_MS`);
 * - una puja en los ultimos 10 s extiende la ronda 10 s, sin pasar del maximo;
 * - al cerrar una ronda se abre la siguiente, y al cerrar la ultima se cierra la sala;
 * - solo puja quien fue admitido antes del inicio.
 *
 * El estado vive mientras la pestaña este abierta: recargar la pagina lo reinicia.
 */

const ME = 'demo-me';
const ROUND_MS = 3 * 60_000;
const MAX_ROUND_MS = 8 * 60_000;
const EXTENSION_MS = 10_000;
const MINUTE = 60_000;

const RIVALS = [
  { id: 'r-ana', alias: 'Ana_123' },
  { id: 'r-carlos', alias: 'CarlosM' },
  { id: 'r-vale', alias: 'ValeU' },
  { id: 'r-sofi', alias: 'SofiT' },
];
const aliasOf = (id: string) =>
  id === ME
    ? 'Tú'
    : (RIVALS.find((rival) => rival.id === id)?.alias ?? 'Participante');

interface DemoItem {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  basePrice: number;
  buyNowPrice: number | null;
}

interface DemoBid {
  id: string;
  bidderId: string;
  amount: number;
  at: number;
}

interface DemoRound {
  id: string;
  position: number;
  item: DemoItem;
  status: RoundStatus;
  currentPrice: number;
  currentBidderId: string | null;
  startedAt: number | null;
  endsAt: number | null;
  maximumEndsAt: number | null;
  bids: DemoBid[];
  /** Hasta donde llegan los rivales simulados en esta ronda. */
  rivalCap: number;
}

interface DemoRoom {
  id: string;
  name: string;
  title: string;
  status: RoomStatus;
  startsAt: number;
  capacity: number;
  admitted: number;
  isParticipant: boolean;
  rounds: DemoRound[];
  activity: RoomActivity[];
  autoBid: AutoBid;
  closedAt: number | null;
  /** Cuando puja el proximo rival simulado. */
  nextRivalAt: number;
}

export interface DemoAuctionOptions {
  now?: () => number;
  random?: () => number;
  /** Latencia simulada de cada operacion. En pruebas, 0. */
  latencyMs?: number;
  /** Cada cuanto avanza el reloj de la demo mientras hay alguien escuchando. */
  tickMs?: number;
  /** Apaga los rivales simulados (pruebas deterministas). */
  rivals?: boolean;
}

function item(
  id: string,
  name: string,
  category: string,
  basePrice: number,
  description: string,
  buyNowPrice: number | null = null,
  condition = 'Bueno',
): DemoItem {
  return { id, name, category, basePrice, description, buyNowPrice, condition };
}

export function createDemoAuctionGateway(
  options: DemoAuctionOptions = {},
): AuctionGateway {
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const latency = options.latencyMs ?? 0;
  const tickMs = options.tickMs ?? 1000;
  const rivalsOn = options.rivals ?? true;

  let seq = 0;
  const id = (prefix: string) => `${prefix}-${(seq += 1)}`;

  const rooms = seed(now());
  const notifications: AppNotification[] = seedNotifications(now());
  const listeners = new Map<string, Set<(state: LiveRoom) => void>>();
  let timer: ReturnType<typeof setInterval> | undefined;

  // --- Semilla ---------------------------------------------------------------

  function round(
    position: number,
    it: DemoItem,
    status: RoundStatus = 'SCHEDULED',
  ): DemoRound {
    return {
      id: `${it.id}-round`,
      position,
      item: it,
      status,
      currentPrice: it.basePrice,
      currentBidderId: null,
      startedAt: null,
      endsAt: null,
      maximumEndsAt: null,
      bids: [],
      rivalCap: it.basePrice + BID_INCREMENT * (4 + Math.floor(random() * 8)),
    };
  }

  function withBids(
    target: DemoRound,
    bids: Array<[string, number, number]>,
    t: number,
  ) {
    for (const [bidderId, amount, secondsAgo] of bids) {
      target.bids.push({
        id: id('bid'),
        bidderId,
        amount,
        at: t - secondsAgo * 1000,
      });
    }
    const last = target.bids.at(-1);
    if (last) {
      target.currentPrice = last.amount;
      target.currentBidderId = last.bidderId;
      // Los rivales siguen pujando un rato por encima de lo que ya hay.
      target.rivalCap =
        last.amount + BID_INCREMENT * (6 + Math.floor(random() * 10));
    }
  }

  function seed(t: number): DemoRoom[] {
    // Sala 04: en curso, la persona participa. Es la sala del diseño.
    const r04 = [
      round(
        1,
        item(
          'calc-casio',
          'Calculadora Casio',
          'Electrónica',
          150,
          'Calculadora científica fx-570. Funciona perfecto, sin tapa.',
        ),
        'CLOSED',
      ),
      round(
        2,
        item(
          'mochila-negra',
          'Mochila negra',
          'Accesorios',
          250,
          'Mochila negra con varios compartimentos. En buen estado, con detalles de uso. Encontrado en la Biblioteca Central.',
          900,
        ),
        'ACTIVE',
      ),
      round(
        3,
        item(
          'audifonos-sony',
          'Audífonos Sony',
          'Electrónica',
          800,
          'Audífonos Sony WH-1000XM4 con estuche. Batería en buen estado.',
          1500,
        ),
      ),
      round(
        4,
        item(
          'termo-stanley',
          'Termo Stanley',
          'Hogar',
          150,
          'Termo Stanley de 1 litro, color verde. Algunos rayones.',
          300,
        ),
      ),
      round(
        5,
        item(
          'control-ps5',
          'Control PS5',
          'Videojuegos',
          300,
          'Control DualSense blanco. Encontrado en el coliseo.',
          600,
        ),
      ),
    ];
    withBids(
      r04[0],
      [
        ['r-ana', 180, 1500],
        ['r-carlos', 200, 1400],
        [ME, 220, 1300],
      ],
      t,
    );
    r04[0].startedAt = t - 22 * MINUTE;
    r04[0].endsAt = t - 19 * MINUTE;
    withBids(
      r04[1],
      [
        ['r-sofi', 300, 95],
        ['r-vale', 340, 35],
        ['r-carlos', 360, 20],
        ['r-ana', 370, 12],
        [ME, 380, 6],
      ],
      t,
    );
    r04[1].endsAt = t + 501_000;
    r04[1].maximumEndsAt = t + 501_000 + 3 * MINUTE;
    r04[1].startedAt = t - 19 * MINUTE;

    // Sala 07: en curso, la persona no entro a tiempo: solo seguimiento.
    const r07 = [
      round(
        1,
        item(
          'lampara-led',
          'Lámpara LED',
          'Hogar',
          100,
          'Lámpara de escritorio recargable.',
        ),
        'CLOSED',
      ),
      round(
        2,
        item(
          'reloj-inteligente',
          'Reloj inteligente',
          'Electrónica',
          1200,
          'Reloj inteligente con cargador. Pantalla sin rayones.',
          2200,
        ),
        'ACTIVE',
      ),
      round(
        3,
        item(
          'tenis-deportivos',
          'Tenis deportivos',
          'Ropa',
          250,
          'Tenis talla 41, poco uso.',
        ),
      ),
      round(
        4,
        item(
          'botella-termica',
          'Botella térmica',
          'Hogar',
          60,
          'Botella térmica de acero, 750 ml.',
        ),
      ),
    ];
    withBids(
      r07[0],
      [
        ['r-vale', 120, 1500],
        ['r-ana', 150, 1300],
      ],
      t,
    );
    withBids(
      r07[1],
      [
        ['r-vale', 1400, 60],
        ['r-carlos', 1450, 30],
        ['r-ana', 1500, 12],
      ],
      t,
    );
    r07[1].endsAt = t + 754_000;
    r07[1].maximumEndsAt = t + 754_000 + 2 * MINUTE;
    r07[1].startedAt = t - 4 * MINUTE;

    // Sala 05: programada, con inscripcion abierta.
    const r05 = [
      round(
        1,
        item(
          'macbook-air',
          'MacBook Air',
          'Electrónica',
          1200,
          'MacBook Air 2020, 8 GB. Con cargador.',
          2500,
        ),
      ),
      round(
        2,
        item(
          'parlante-jbl',
          'Parlante JBL',
          'Electrónica',
          260,
          'Parlante JBL Flip 5, azul.',
        ),
      ),
      round(
        3,
        item(
          'chaqueta-jean',
          'Chaqueta de jean',
          'Ropa',
          150,
          'Chaqueta de jean talla M.',
        ),
      ),
      round(
        4,
        item(
          'libro-calculo',
          'Libro de cálculo',
          'Libros',
          80,
          'Cálculo de Stewart, 8.ª edición.',
        ),
      ),
      round(
        5,
        item(
          'gafas-sol',
          'Gafas de sol',
          'Accesorios',
          120,
          'Gafas de sol polarizadas con estuche.',
        ),
      ),
    ];

    // Sala 02: cerrada, la persona participo. Alimenta "La sala finalizo" y el historial.
    const r02 = [
      round(
        1,
        item(
          'audifonos-jbl',
          'Audífonos JBL',
          'Electrónica',
          600,
          'Audífonos JBL Tune 510BT.',
        ),
        'CLOSED',
      ),
      round(
        2,
        item(
          'calculadora-hp',
          'Calculadora HP',
          'Electrónica',
          150,
          'Calculadora financiera HP 10bII+.',
        ),
        'CLOSED',
      ),
      round(
        3,
        item(
          'mochila-totto',
          'Mochila Totto',
          'Accesorios',
          500,
          'Mochila Totto para portátil.',
        ),
        'CLOSED',
      ),
      round(
        4,
        item(
          'termo-contigo',
          'Termo Contigo',
          'Hogar',
          180,
          'Termo Contigo de 700 ml.',
        ),
        'CLOSED',
      ),
      round(
        5,
        item(
          'control-xbox',
          'Control Xbox',
          'Videojuegos',
          300,
          'Control inalámbrico de Xbox Series.',
        ),
        'CLOSED',
      ),
    ];
    const day = 24 * 60 * MINUTE;
    withBids(
      r02[0],
      [
        ['r-ana', 900, 2 * 86_400],
        [ME, 1000, 2 * 86_400 - 30],
      ],
      t,
    );
    withBids(r02[1], [[ME, 220, 2 * 86_400 - 600]], t);
    withBids(
      r02[2],
      [
        [ME, 1000, 2 * 86_400 - 900],
        ['r-carlos', 1010, 2 * 86_400 - 880],
      ],
      t,
    );
    r02[3].currentPrice = 180;
    withBids(
      r02[4],
      [
        [ME, 340, 2 * 86_400 - 1500],
        ['r-vale', 350, 2 * 86_400 - 1480],
      ],
      t,
    );

    const autoBid: AutoBid = { enabled: false, limit: 0, stopped: false };
    return [
      {
        id: 'sala-04',
        name: 'Sala 04',
        title: 'Audífonos, calculadora y más',
        status: 'ACTIVE',
        startsAt: t - 22 * MINUTE,
        capacity: 40,
        admitted: 32,
        isParticipant: true,
        rounds: r04,
        activity: [
          {
            id: id('act'),
            kind: 'STARTED',
            text: 'La sala inició con 32 participantes',
            at: iso(t - 22 * MINUTE),
          },
          {
            id: id('act'),
            kind: 'AWARDED',
            text: 'Calculadora Casio adjudicada',
            at: iso(t - 19 * MINUTE),
          },
          {
            id: id('act'),
            kind: 'BID',
            text: 'ValeU pujó 340 ECICoin',
            at: iso(t - 35_000),
          },
          {
            id: id('act'),
            kind: 'OUTBID',
            text: 'CarlosM fue superado',
            at: iso(t - 20_000),
          },
          {
            id: id('act'),
            kind: 'BID',
            text: 'Ana_123 pujó 370 ECICoin',
            at: iso(t - 12_000),
          },
        ],
        autoBid: { enabled: true, limit: 1000, stopped: false },
        closedAt: null,
        nextRivalAt: t + 15_000,
      },
      {
        id: 'sala-07',
        name: 'Sala 07',
        title: 'Reloj, tenis y más',
        status: 'ACTIVE',
        startsAt: t - 13 * MINUTE,
        capacity: 30,
        admitted: 28,
        isParticipant: false,
        rounds: r07,
        activity: [
          {
            id: id('act'),
            kind: 'STARTED',
            text: 'La sala inició con 28 participantes',
            at: iso(t - 13 * MINUTE),
          },
          {
            id: id('act'),
            kind: 'AWARDED',
            text: 'Lámpara LED adjudicada',
            at: iso(t - 5 * MINUTE),
          },
          {
            id: id('act'),
            kind: 'BID',
            text: 'Ana_123 pujó 1.500 ECICoin',
            at: iso(t - 12_000),
          },
        ],
        autoBid: { ...autoBid },
        closedAt: null,
        nextRivalAt: t + 9_000,
      },
      {
        id: 'sala-05',
        name: 'Sala 05',
        title: 'MacBook, parlante y más',
        status: 'SCHEDULED',
        startsAt: t + 2 * 60 * MINUTE + 34 * MINUTE + 16_000,
        capacity: 40,
        admitted: 32,
        isParticipant: false,
        rounds: r05,
        activity: [],
        autoBid: { ...autoBid },
        closedAt: null,
        nextRivalAt: Infinity,
      },
      {
        id: 'sala-02',
        name: 'Sala 02',
        title: 'Audífonos, calculadora y más',
        status: 'CLOSED',
        startsAt: t - 2 * day - 40 * MINUTE,
        capacity: 40,
        admitted: 32,
        isParticipant: true,
        rounds: r02,
        activity: [],
        autoBid: { enabled: false, limit: 1000, stopped: true },
        closedAt: t - 2 * day,
        nextRivalAt: Infinity,
      },
    ];
  }

  function seedNotifications(t: number): AppNotification[] {
    const note = (
      kind: NotificationKind,
      title: string,
      body: string,
      minutesAgo: number,
      roomId: string | null,
      read = true,
    ): AppNotification => ({
      id: id('ntf'),
      kind,
      title,
      body,
      at: iso(t - minutesAgo * MINUTE),
      read,
      roomId,
    });
    return [
      note(
        'ROOM_SOON',
        'Subasta próxima',
        'La Sala 05 comienza pronto. Ingresa antes del inicio para poder pujar.',
        10,
        'sala-05',
        false,
      ),
      note(
        'FOLLOW_ONLY',
        'Sala en curso · solo seguimiento',
        'La Sala 07 ya inició. Puedes seguirla, pero el ingreso está cerrado.',
        13,
        'sala-07',
        false,
      ),
      note(
        'WON',
        '¡Ganaste este objeto!',
        'Ganaste la Calculadora Casio por 220 ECICoin. La sala continúa con el siguiente objeto.',
        19,
        'sala-04',
      ),
      note(
        'LIMIT',
        'Alcanzaste tu límite máximo',
        'No haremos más pujas automáticas en Mochila Totto.',
        2 * 24 * 60 + 5,
        'sala-02',
      ),
      note(
        'ROOM_CLOSED',
        'La sala finalizó',
        'Sala 02 cerrada. Revisa tu resumen: 2 ganados, 2 perdidos, 1 sin ofertar.',
        2 * 24 * 60,
        'sala-02',
      ),
    ];
  }

  // --- Reloj de la demo --------------------------------------------------------

  function notify(
    kind: NotificationKind,
    title: string,
    body: string,
    roomId: string,
  ) {
    notifications.unshift({
      id: id('ntf'),
      kind,
      title,
      body,
      at: iso(now()),
      read: false,
      roomId,
    });
  }

  function activity(room: DemoRoom, kind: RoomActivity['kind'], text: string) {
    room.activity.push({ id: id('act'), kind, text, at: iso(now()) });
  }

  function openRound(room: DemoRoom, target: DemoRound, t: number) {
    target.status = 'ACTIVE';
    target.startedAt = t;
    target.endsAt = t + ROUND_MS;
    target.maximumEndsAt = t + MAX_ROUND_MS;
    room.nextRivalAt = t + 8_000 + random() * 8_000;
  }

  function recordBid(
    room: DemoRoom,
    target: DemoRound,
    bidderId: string,
    amount: number,
    t: number,
  ) {
    const previous = target.currentBidderId;
    target.bids.push({ id: id('bid'), bidderId, amount, at: t });
    target.currentPrice = amount;
    target.currentBidderId = bidderId;
    // Anti-francotirador: igual que auction-service.
    if (
      target.endsAt &&
      target.maximumEndsAt &&
      target.endsAt - t < EXTENSION_MS
    ) {
      target.endsAt = Math.min(
        target.endsAt + EXTENSION_MS,
        target.maximumEndsAt,
      );
    }
    activity(
      room,
      'BID',
      `${aliasOf(bidderId)} pujó ${amount.toLocaleString('es-CO')} ECICoin`,
    );
    if (previous && previous !== bidderId) {
      activity(room, 'OUTBID', `${aliasOf(previous)} fue superado`);
      if (previous === ME) {
        notify(
          'OUTBID',
          '¡Te superaron!',
          `${aliasOf(bidderId)} pujó ${amount - (lastBidOf(target, ME) ?? amount)} ECICoin más en ${target.item.name}.`,
          room.id,
        );
      }
    }
  }

  function lastBidOf(target: DemoRound, bidderId: string): number | null {
    const mine = target.bids.filter((bid) => bid.bidderId === bidderId);
    return mine.length ? mine[mine.length - 1].amount : null;
  }

  function advance() {
    const t = now();
    for (const room of rooms) {
      if (room.status === 'SCHEDULED' && room.startsAt <= t) {
        room.status = 'ACTIVE';
        activity(
          room,
          'STARTED',
          `La sala inició con ${room.admitted} participantes`,
        );
        openRound(room, room.rounds[0], t);
      }
      if (room.status !== 'ACTIVE') continue;

      const active = room.rounds.find((r) => r.status === 'ACTIVE');
      if (!active) continue;

      if (active.endsAt !== null && active.endsAt <= t) {
        active.status = 'CLOSED';
        if (active.currentBidderId) {
          activity(room, 'AWARDED', `${active.item.name} adjudicada`);
          if (active.currentBidderId === ME) {
            notify(
              'WON',
              '¡Ganaste este objeto!',
              `Ganaste ${active.item.name} por ${active.currentPrice.toLocaleString('es-CO')} ECICoin.`,
              room.id,
            );
          }
        }
        room.autoBid.stopped = false;
        const next = room.rounds.find((r) => r.status === 'SCHEDULED');
        if (next) {
          openRound(room, next, t);
        } else {
          room.status = 'CLOSED';
          room.closedAt = t;
          if (room.isParticipant)
            notify(
              'ROOM_CLOSED',
              'La sala finalizó',
              `${room.name} cerrada. Revisa tu resumen.`,
              room.id,
            );
        }
        continue;
      }

      // Puja automatica de quien mira: responde cuando lo superan, hasta su limite.
      if (
        room.isParticipant &&
        room.autoBid.enabled &&
        !room.autoBid.stopped &&
        active.currentBidderId &&
        active.currentBidderId !== ME &&
        lastBidOf(active, ME) !== null
      ) {
        const amount = nextBidFor(active.currentPrice);
        if (amount <= room.autoBid.limit) {
          recordBid(room, active, ME, amount, t);
        } else {
          room.autoBid.stopped = true;
          notify(
            'LIMIT',
            'Alcanzaste tu límite máximo',
            `No haremos más pujas automáticas en ${active.item.name}.`,
            room.id,
          );
        }
        continue;
      }

      if (rivalsOn && t >= room.nextRivalAt) {
        room.nextRivalAt = t + 10_000 + random() * 12_000;
        const amount = nextBidFor(active.currentPrice);
        if (amount > active.rivalCap) continue;
        const candidates = RIVALS.filter(
          (rival) => rival.id !== active.currentBidderId,
        );
        const rival = candidates[Math.floor(random() * candidates.length)];
        recordBid(room, active, rival.id, amount, t);
      }
    }
  }

  function emit() {
    for (const [roomId, set] of listeners) {
      if (set.size === 0) continue;
      const state = live(find(roomId));
      for (const listener of set) listener(state);
    }
  }

  function tick() {
    advance();
    emit();
  }

  // --- Vistas -----------------------------------------------------------------

  function find(roomId: string): DemoRoom {
    const room = rooms.find((candidate) => candidate.id === roomId);
    if (!room) throw notFound('La sala no existe.');
    return room;
  }

  /** La misma regla que el servicio: el precio minimo sin pujas, el vigente + 100 despues. */
  function minimumFor(target: DemoRound): number {
    return minimumBid({
      startingPrice: target.item.basePrice,
      currentPrice: target.currentPrice,
      hasBids: target.currentBidderId !== null,
    });
  }

  function roundView(target: DemoRound): Round {
    const mine = target.bids
      .filter((bid) => bid.bidderId === ME)
      .map((bid) => bid.amount);
    return {
      id: target.id,
      position: target.position,
      itemId: target.item.id,
      itemName: target.item.name,
      status: target.status,
      basePrice: target.item.basePrice,
      currentPrice: target.currentPrice,
      minimumBid: minimumFor(target),
      currentBidderId: target.currentBidderId,
      startedAt: target.startedAt === null ? null : iso(target.startedAt),
      endsAt: target.endsAt === null ? null : iso(target.endsAt),
      maximumEndsAt:
        target.maximumEndsAt === null ? null : iso(target.maximumEndsAt),
      buyNowPrice: target.item.buyNowPrice,
      leading: target.currentBidderId === ME,
      myHighestBid: mine.length ? Math.max(...mine) : null,
      wonByMe: target.status === 'CLOSED' && target.currentBidderId === ME,
    };
  }

  function roomView(room: DemoRoom): Room {
    return {
      id: room.id,
      name: room.name,
      title: room.title,
      status: room.status,
      startsAt: iso(room.startsAt),
      capacity: room.capacity,
      admitted: room.admitted,
      isParticipant: room.isParticipant,
      rounds: room.rounds.map(roundView),
    };
  }

  function live(room: DemoRoom): LiveRoom {
    const active = room.rounds.find((r) => r.status === 'ACTIVE') ?? null;
    const bids: Bid[] = (active?.bids ?? [])
      .slice(-5)
      .reverse()
      .map((bid) => ({
        id: bid.id,
        alias: aliasOf(bid.bidderId),
        amount: bid.amount,
        at: iso(bid.at),
        mine: bid.bidderId === ME,
      }));
    return {
      room: roomView(room),
      round: active ? roundView(active) : null,
      bids,
      activity: room.activity.slice(-4).reverse(),
      autoBid: { ...room.autoBid },
      participants: room.admitted,
      serverTime: iso(now()),
    };
  }

  function itemView(room: DemoRoom, target: DemoRound): AuctionItem {
    const status =
      target.status === 'ACTIVE'
        ? 'LIVE'
        : target.status === 'SCHEDULED'
          ? 'UPCOMING'
          : 'CLOSED';
    return {
      id: target.item.id,
      name: target.item.name,
      description: target.item.description,
      category: target.item.category,
      condition: target.item.condition,
      imageUrl: null,
      roomId: room.id,
      roomName: room.name,
      position: target.position,
      roomSize: room.rounds.length,
      status,
      currentPrice: target.currentPrice,
      nextBid: minimumFor(target),
      buyNowPrice: target.item.buyNowPrice,
      startsAt: iso(room.startsAt),
      endsAt: status === 'LIVE' && target.endsAt ? iso(target.endsAt) : null,
      roundStartedAt: target.startedAt === null ? null : iso(target.startedAt),
      awarded: target.status === 'CLOSED' && target.currentBidderId !== null,
    };
  }

  function activeRoundFor(room: DemoRoom): DemoRound {
    if (room.status !== 'ACTIVE') throw conflict('La sala no está en curso.');
    if (!room.isParticipant)
      throw forbidden('El ingreso a esta sala cerró al iniciar la subasta.');
    const active = room.rounds.find((r) => r.status === 'ACTIVE');
    if (!active || (active.endsAt !== null && active.endsAt <= now()))
      throw conflict('La ronda no está activa.');
    return active;
  }

  const wait = () =>
    latency > 0
      ? new Promise((resolve) => setTimeout(resolve, latency))
      : Promise.resolve();

  async function run<T>(operation: () => T): Promise<T> {
    await wait();
    advance();
    const result = operation();
    emit();
    return result;
  }

  // --- Puerto --------------------------------------------------------------------

  return {
    items: () =>
      run(() =>
        rooms.flatMap((room) =>
          room.rounds.map((target) => itemView(room, target)),
        ),
      ),

    item: (itemId) =>
      run(() => {
        for (const room of rooms) {
          const target = room.rounds.find((r) => r.item.id === itemId);
          if (target) return itemView(room, target);
        }
        throw notFound('El objeto no existe.');
      }),

    room: (roomId) => run(() => roomView(find(roomId))),

    joinRoom: (roomId) =>
      run(() => {
        const room = find(roomId);
        if (room.isParticipant) return roomView(room);
        if (room.status !== 'SCHEDULED') throw conflict('Sala cerrada.');
        if (room.admitted >= room.capacity) throw conflict('Sala completa.');
        room.isParticipant = true;
        room.admitted += 1;
        return roomView(room);
      }),

    liveRoom: (roomId) => run(() => live(find(roomId))),

    placeBid: (roomId, amount) =>
      run(() => {
        const room = find(roomId);
        const active = activeRoundFor(room);
        const minimum = minimumFor(active);
        if (!Number.isInteger(amount) || amount < minimum) {
          throw conflict(`La puja debe ser de al menos ${minimum} ECICoin.`);
        }
        recordBid(room, active, ME, amount, now());
        room.nextRivalAt = now() + 6_000 + random() * 8_000;
        return live(room);
      }),

    buyNow: (roomId) =>
      run(() => {
        const room = find(roomId);
        const active = activeRoundFor(room);
        if (active.item.buyNowPrice === null)
          throw conflict('Este objeto no tiene precio de compra inmediata.');
        recordBid(room, active, ME, active.item.buyNowPrice, now());
        active.endsAt = now();
        advance();
        return live(room);
      }),

    setAutoBid: (roomId, config) =>
      run(() => {
        const room = find(roomId);
        room.autoBid = {
          enabled: config.enabled,
          limit: config.limit,
          stopped: false,
        };
        return live(room);
      }),

    subscribe(roomId, listener) {
      const set = listeners.get(roomId) ?? new Set();
      set.add(listener);
      listeners.set(roomId, set);
      if (!timer && tickMs > 0) timer = setInterval(tick, tickMs);
      return () => {
        set.delete(listener);
        const anyone = [...listeners.values()].some((entry) => entry.size > 0);
        if (!anyone && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },

    roomSummary: (roomId) =>
      run(() => {
        const room = find(roomId);
        const rows = room.rounds.map((target) => {
          const mine = lastBidOf(target, ME);
          const won =
            target.status === 'CLOSED' && target.currentBidderId === ME;
          const outcome = won ? 'WON' : mine === null ? 'NO_BID' : 'LOST';
          const detail = won
            ? 'adjudicado a tu favor'
            : outcome === 'NO_BID'
              ? 'no participaste'
              : room.autoBid.limit && (mine ?? 0) >= room.autoBid.limit
                ? `alcanzaste tu límite de ${room.autoBid.limit.toLocaleString('es-CO')}`
                : 'te superaron en la última ronda';
          return {
            itemId: target.item.id,
            itemName: target.item.name,
            position: target.position,
            outcome,
            amount: won ? target.currentPrice : null,
            detail: `Objeto ${target.position} · ${detail}`,
          } as RoomSummary['rows'][number];
        });
        return {
          roomId: room.id,
          roomName: room.name,
          items: room.rounds.length,
          participants: room.admitted,
          closedAt: iso(room.closedAt ?? now()),
          rows,
          totalSpent: rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
        };
      }),

    myBids: () =>
      run(() =>
        rooms
          .flatMap((room) =>
            room.rounds
              .filter((target) => lastBidOf(target, ME) !== null)
              .map((target): MyBid => {
                const mine = lastBidOf(target, ME) ?? 0;
                const leading = target.currentBidderId === ME;
                const status =
                  target.status === 'CLOSED'
                    ? leading
                      ? 'WON'
                      : 'LOST'
                    : leading
                      ? 'WINNING'
                      : 'OUTBID';
                const state =
                  target.status === 'CLOSED'
                    ? leading
                      ? 'cerrada · reclamar en Objetos Perdidos'
                      : 'cerrada'
                    : 'en curso';
                return {
                  id: target.id,
                  itemId: target.item.id,
                  itemName: target.item.name,
                  roomId: room.id,
                  detail: `${room.name} · Objeto ${target.position} de ${room.rounds.length} · ${state}`,
                  amount: status === 'WON' ? target.currentPrice : mine,
                  status,
                  outbidBy:
                    status === 'OUTBID' ? target.currentPrice - mine : null,
                  autoBidLimit:
                    status === 'WINNING' && room.autoBid.enabled
                      ? room.autoBid.limit
                      : null,
                };
              }),
          )
          .reverse(),
      ),

    notifications: () =>
      run(() => notifications.map((entry) => ({ ...entry }))),

    markNotificationsRead: () =>
      run(() => {
        for (const entry of notifications) entry.read = true;
      }),
  };
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function notFound(detail: string) {
  return new ApiError({
    type: ProblemType.NOT_FOUND,
    title: 'No encontrado',
    status: 404,
    detail,
  });
}

function conflict(detail: string) {
  return new ApiError({
    type: ProblemType.INVALID_TRANSITION,
    title: 'No se pudo completar',
    status: 409,
    detail,
  });
}

function forbidden(detail: string) {
  return new ApiError({
    type: ProblemType.FORBIDDEN,
    title: 'Solo seguimiento',
    status: 403,
    detail,
  });
}

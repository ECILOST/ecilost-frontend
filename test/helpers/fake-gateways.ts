import type { Container } from '@/app/container';
import { createDemoAuctionGateway } from '@/features/auctions/api/demo-auction.gateway';
import { Role } from '@/features/auth/domain/role';
import type {
  AccessTokenResponse,
  Principal,
  UserLookup,
} from '@/features/auth/model/session';
import type { AuthGateway } from '@/features/auth/ports/auth.gateway';
import { ItemCondition } from '@/features/catalog/domain/item-condition';
import { ItemStatus } from '@/features/catalog/domain/item-status';
import type {
  CreateItemRequest,
  ItemDetail,
  ItemFicha,
  ItemRecord,
  ItemSummary,
  ItemView,
  ListItemsQuery,
  UpdateItemRequest,
} from '@/features/catalog/model/item';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import { LotStatus } from '@/features/lots/domain/lot-status';
import type { CreateLotRequest, Lot } from '@/features/lots/model/lot';
import type { LotGateway } from '@/features/lots/ports/lot.gateway';
import { MediaKind, type MediaAsset } from '@/features/media/model/media';
import type { MediaGateway } from '@/features/media/ports/media.gateway';
import {
  AuctionableKind,
  RoomStatus,
  RoundStatus,
} from '@/features/rooms/domain/room-status';
import type {
  RoomDetail,
  ScheduleRoomRequest,
} from '@/features/rooms/model/room';
import type { RoomGateway } from '@/features/rooms/ports/room.gateway';
import type { RechargeRequest, Wallet } from '@/features/wallet/model/wallet';
import type { WalletGateway } from '@/features/wallet/ports/wallet.gateway';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import { createSessionChannel } from '@/shared/api/session-channel';
import { createTokenStore } from '@/shared/api/token-store';

/**
 * Dobles de los puertos, el equivalente de `test/helpers/fake-repositories.ts` en el back.
 *
 * Las pruebas de pantalla no simulan `fetch` ni levantan un servidor: cambian la
 * implementacion del puerto, que es justo lo que los puertos existen para permitir.
 */

export const STUDENT: Principal = {
  userId: 'user-student',
  role: Role.STUDENT,
  canManageCatalog: false,
  canScheduleRooms: false,
  canManageWallets: false,
  canBid: true,
};

export const STAFF: Principal = {
  userId: 'user-staff',
  role: Role.STAFF,
  canManageCatalog: true,
  canScheduleRooms: true,
  canManageWallets: true,
  canBid: false,
};

const UNAUTHENTICATED = new ApiError({
  type: ProblemType.UNAUTHENTICATED,
  title: 'Sin sesion',
  status: 401,
});

/**
 * El objeto sin nada derivado de su multimedia: lo que devuelven las escrituras.
 *
 * Existe aparte porque la fila del listado lleva portada y la ficha no. Construir las dos
 * desde aqui evita que un doble entregue un campo que el servicio no manda en ese endpoint.
 */
function recordFixture(): ItemRecord {
  return {
    id: 'item-1',
    name: 'Portatil Lenovo ThinkPad',
    description:
      'Carcasa negra con una calcomania de la universidad en la tapa.',
    condition: ItemCondition.GOOD,
    category: 'Electronica',
    status: ItemStatus.AVAILABLE,
    lotId: null,
    roundId: null,
    registeredAt: '2026-09-10T15:04:05.000Z',
    version: 0,
    registeredBy: STAFF.userId,
    lastModifiedBy: STAFF.userId,
    lastModifiedAt: '2026-09-10T15:04:05.000Z',
  };
}

export function itemFixture(overrides: Partial<ItemSummary> = {}): ItemSummary {
  // Sin portada por defecto: la mayoria de las pruebas no hablan de fotografias, y un
  // objeto recien registrado tampoco tiene ninguna.
  return { ...recordFixture(), coverUrl: null, ...overrides };
}

export function photoFixture(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'media-1',
    kind: MediaKind.PHOTO,
    contentType: 'image/jpeg',
    sizeBytes: 248_312,
    position: 0,
    url: 'http://localhost:9000/ecilost-catalog-media/items/item-1/a1b2.jpg?X-Amz-Signature=x',
    uploadedAt: '2026-09-10T15:10:00.000Z',
    ...overrides,
  };
}

/**
 * Ficha tal como la recibe un estudiante: sin version ni rastro del funcionario.
 *
 * Se enumera lo que entra en vez de quitar cuatro campos del objeto completo, igual que
 * `toItemFichaResponse` en el servicio: asi un campo nuevo no se cuela en el doble y las
 * pruebas siguen describiendo lo que el estudiante ve de verdad.
 */
export function fichaFixture(overrides: Partial<ItemFicha> = {}): ItemFicha {
  const item = itemFixture();

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    condition: item.condition,
    category: item.category,
    status: item.status,
    lotId: item.lotId,
    roundId: item.roundId,
    registeredAt: item.registeredAt,
    photos: [photoFixture()],
    video: null,
    ...overrides,
  };
}

/** La misma ficha con el rastro administrativo, tal como la recibe un funcionario. */
export function detailFixture(overrides: Partial<ItemDetail> = {}): ItemDetail {
  // Desde el registro y no desde la fila del listado: la ficha trae la galeria entera, no
  // la portada, y colar `coverUrl` aqui describiria una respuesta que el servicio no da.
  return {
    ...recordFixture(),
    photos: [photoFixture()],
    video: null,
    ...overrides,
  };
}

/** Las personas que el doble de identidad sabe encontrar, por su correo. */
export const DIRECTORY: Record<string, UserLookup> = {
  'estudiante@escuelaing.edu.co': {
    userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'estudiante@escuelaing.edu.co',
    fullName: 'Mariana Parra',
    role: Role.STUDENT,
    status: 'ACTIVE',
  },
  'suspendida@escuelaing.edu.co': {
    userId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    email: 'suspendida@escuelaing.edu.co',
    fullName: 'Cuenta Inactiva',
    role: Role.STUDENT,
    status: 'SUSPENDED',
  },
};

export function createFakeAuthGateway(
  principal: Principal | null,
): AuthGateway {
  const token: AccessTokenResponse = {
    access_token: 'token-de-prueba',
    token_type: 'Bearer',
    expires_in: 900,
    role: principal?.role ?? Role.STUDENT,
  };

  return {
    exchangeSession: () =>
      principal ? Promise.resolve(token) : Promise.reject(UNAUTHENTICATED),
    me: () =>
      principal ? Promise.resolve(principal) : Promise.reject(UNAUTHENTICATED),
    profile: () =>
      principal
        ? Promise.resolve({
            userId: principal.userId,
            email: 'persona@escuelaing.edu.co',
            fullName: 'Andrea Parra',
            // Sin avatar a proposito: es el caso que hay que ver funcionando, porque la
            // direccion que da Google caduca y deja de servirse.
            avatarUrl: null,
            institutionalCode: null,
            role: principal.role,
          })
        : Promise.reject(UNAUTHENTICATED),
    findUserByEmail: (email: string) => {
      const found = DIRECTORY[email.trim().toLowerCase()];
      return found
        ? Promise.resolve(found)
        : Promise.reject(
            new ApiError({
              type: ProblemType.NOT_FOUND,
              title: 'El recurso no existe',
              status: 404,
              detail: 'No hay ninguna cuenta con ese correo.',
            }),
          );
    },
    updateProfile: () => Promise.reject(new Error('no lo usa esta prueba')),
    logout: () => Promise.resolve(),
    loginUrl: () => '/auth/google',
  };
}

export interface FakeCatalog {
  items?: ItemSummary[];
  views?: Record<string, ItemView>;
  /** Para comprobar con que filtros se llamo al servicio. */
  calls?: ListItemsQuery[];
  /** Lo que se mando registrar, en orden. */
  created?: CreateItemRequest[];
  /** Lo que se mando editar. Lleva la version, que es lo que de verdad hay que comprobar. */
  updated?: { id: string; request: UpdateItemRequest }[];
  /** Lo que se mando borrar, con la version que se envio en la consulta. */
  deleted?: { id: string; version: number }[];
  /**
   * Con que error responde cada escritura, cuando la prueba quiere uno.
   *
   * Se declara por operacion y no como un solo fallo global porque lo que hay que probar es
   * que cada error cae donde debe: la validacion debajo de su campo y el conflicto arriba.
   */
  rejects?: { create?: ApiError; update?: ApiError; remove?: ApiError };
}

export function createFakeItemGateway(catalog: FakeCatalog = {}): ItemGateway {
  const items = catalog.items ?? [];
  const views = catalog.views ?? {};
  const calls = catalog.calls ?? [];
  const created = catalog.created ?? [];
  const updated = catalog.updated ?? [];
  const deleted = catalog.deleted ?? [];

  return {
    list: (query: ListItemsQuery = {}) => {
      calls.push(query);

      const filtered = items.filter(
        (item) =>
          (!query.status || item.status === query.status) &&
          (!query.category || item.category === query.category),
      );

      // Se pagina como el servicio, porque es lo que decide cuando el catalogo ofrece
      // "Cargar mas": una pagina mas corta que el tope significa que ya no queda nada.
      const offset = query.offset ?? 0;
      const limit = query.limit ?? filtered.length;
      return Promise.resolve(filtered.slice(offset, offset + limit));
    },
    findById: (id: string) => {
      const view = views[id];
      return view
        ? Promise.resolve(view)
        : Promise.reject(
            new ApiError({
              type: ProblemType.NOT_FOUND,
              title: 'El objeto no existe',
              status: 404,
            }),
          );
    },
    create: (request: CreateItemRequest) => {
      if (catalog.rejects?.create)
        return Promise.reject(catalog.rejects.create);

      created.push(request);
      const item = itemFixture({ id: `item-${items.length + 1}`, ...request });
      items.push(item);
      // Tambien queda su ficha: crear termina navegando a ella, asi que sin esto la prueba
      // aterrizaria en un 404 justo despues de comprobar que el alta funciono.
      views[item.id] = { ...item, photos: [], video: null };

      return Promise.resolve(item);
    },
    update: (id: string, request: UpdateItemRequest) => {
      if (catalog.rejects?.update)
        return Promise.reject(catalog.rejects.update);

      updated.push({ id, request });
      const { version, ...changes } = request;
      const current = views[id];
      // La ficha guardada se actualiza para que un refresco despues de editar enseñe lo
      // nuevo, y la version sube como la subiria el servicio en cada escritura aceptada.
      const next = { ...current, ...changes, version: version + 1 } as ItemView;
      views[id] = next;

      return Promise.resolve(next as ItemRecord);
    },
    remove: (id: string, version: number) => {
      if (catalog.rejects?.remove)
        return Promise.reject(catalog.rejects.remove);

      deleted.push({ id, version });
      delete views[id];
      return Promise.resolve();
    },
  };
}

export function lotFixture(overrides: Partial<Lot> = {}): Lot {
  return {
    id: 'lot-1',
    name: 'Kit de electronica extraviada',
    status: LotStatus.ACTIVE,
    items: [
      { id: 'item-1', name: 'Portatil Lenovo ThinkPad' },
      { id: 'item-2', name: 'Audifonos Sony' },
    ],
    createdBy: STAFF.userId,
    createdAt: '2026-09-18T10:00:00.000Z',
    ...overrides,
  };
}

export interface FakeLots {
  lots?: Lot[];
  /** Lo que se mando crear, en orden. */
  created?: CreateLotRequest[];
  rejects?: { create?: ApiError };
}

export function createFakeLotGateway(catalog: FakeLots = {}): LotGateway {
  const lots = catalog.lots ?? [];
  const created = catalog.created ?? [];

  return {
    list: () => Promise.resolve(lots),
    findById: (id: string) => {
      const lot = lots.find((candidate) => candidate.id === id);
      return lot
        ? Promise.resolve(lot)
        : Promise.reject(
            new ApiError({
              type: ProblemType.NOT_FOUND,
              title: 'El recurso no existe',
              status: 404,
            }),
          );
    },
    create: (request: CreateLotRequest) => {
      if (catalog.rejects?.create)
        return Promise.reject(catalog.rejects.create);

      created.push(request);
      const lot = lotFixture({
        id: `lot-${lots.length + 1}`,
        name: request.name,
        // Se devuelven con el nombre que tenga el doble a mano; lo que importa de la
        // respuesta es cuantos entraron y con que identificadores.
        items: request.itemIds.map((id) => ({ id, name: id })),
      });
      lots.push(lot);

      return Promise.resolve(lot);
    },
  };
}

export function walletFixture(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: 'wallet-1',
    userId: STUDENT.userId,
    // Cadena y no numero, como lo serializa Prisma: es un Decimal(18, 2) y pasarlo por un
    // double perderia precision justo en lo que la plataforma usa como dinero.
    availableBalance: '150000.00',
    heldBalance: '0.00',
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
    ...overrides,
  };
}

export interface FakeWallet {
  wallet?: Wallet;
  /** Lo que se mando recargar, en orden. */
  recharges?: { userId: string; request: RechargeRequest }[];
  rejects?: { mine?: ApiError; recharge?: ApiError };
  /** Simula que la referencia ya existia: el servicio devuelve la recarga de antes. */
  replayed?: boolean;
}

export function createFakeWalletGateway(fake: FakeWallet = {}): WalletGateway {
  const recharges = fake.recharges ?? [];
  const wallet = fake.wallet ?? walletFixture();

  return {
    mine: () =>
      fake.rejects?.mine
        ? Promise.reject(fake.rejects.mine)
        : Promise.resolve(wallet),

    recharge: (userId: string, request: RechargeRequest) => {
      if (fake.rejects?.recharge) return Promise.reject(fake.rejects.recharge);

      recharges.push({ userId, request });
      return Promise.resolve({
        wallet,
        transaction: {
          id: `tx-${recharges.length}`,
          type: 'ADMIN_RECHARGE',
          amount: request.amount.toFixed(2),
          reference: request.reference ?? null,
          createdAt: '2026-09-19T00:00:00.000Z',
        },
        replayed: fake.replayed ?? false,
      });
    },
  };
}

export interface FakeMedia {
  /** Los archivos que se llegaron a mandar, en orden. Es lo que prueba el encadenado. */
  uploaded?: File[];
  /** Los identificadores que se mandaron quitar. */
  removed?: string[];
  /** Con que error responde la subida, por nombre de archivo. */
  rejects?: Record<string, ApiError>;
}

export function createFakeMediaGateway(media: FakeMedia = {}): MediaGateway {
  const uploaded = media.uploaded ?? [];
  const removed = media.removed ?? [];

  return {
    upload: (_itemId: string, file: File) => {
      const rejection = media.rejects?.[file.name];
      if (rejection) return Promise.reject(rejection);

      uploaded.push(file);
      return Promise.resolve(
        photoFixture({
          id: `media-${uploaded.length}`,
          position: uploaded.length - 1,
        }),
      );
    },
    remove: (_itemId: string, mediaId: string) => {
      removed.push(mediaId);
      return Promise.resolve();
    },
  };
}

export function roomFixture(overrides: Partial<RoomDetail> = {}): RoomDetail {
  return {
    id: 'room-1',
    name: 'Subasta de electrónica',
    status: RoomStatus.SCHEDULED,
    startsAt: '2030-10-01T21:00:00.000Z',
    maximumCapacity: 30,
    admittedCount: 4,
    createdAt: '2026-09-25T10:00:00.000Z',
    isParticipant: false,
    rounds: [
      {
        id: 'round-1',
        position: 1,
        status: RoundStatus.SCHEDULED,
        startingPrice: '50000.00',
        currentPrice: '50000.00',
        hasBids: false,
        isLeading: false,
        myHighestBid: null,
        result: null,
        closedAt: null,
        startedAt: null,
        endsAt: null,
        maximumEndsAt: null,
        entries: [{ kind: AuctionableKind.ITEM, catalogId: 'item-1' }],
      },
    ],
    ...overrides,
  };
}

export interface FakeRooms {
  rooms?: RoomDetail[];
  /** Lo que se mando programar, en orden. */
  scheduled?: ScheduleRoomRequest[];
  rejects?: { schedule?: ApiError };
}

export function createFakeRoomGateway(fake: FakeRooms = {}): RoomGateway {
  const rooms = fake.rooms ?? [];
  const scheduled = fake.scheduled ?? [];

  return {
    list: () =>
      Promise.resolve(
        rooms.map(({ rounds, ...room }) => ({
          ...room,
          roundCount: rounds.length,
        })),
      ),
    findById: (id: string) => {
      const room = rooms.find((candidate) => candidate.id === id);
      return room
        ? Promise.resolve(room)
        : Promise.reject(
            new ApiError({
              type: ProblemType.NOT_FOUND,
              title: 'La sala no existe.',
              status: 404,
            }),
          );
    },
    schedule: (request: ScheduleRoomRequest) => {
      if (fake.rejects?.schedule) return Promise.reject(fake.rejects.schedule);

      scheduled.push(request);
      const room = roomFixture({
        id: `room-${rooms.length + 1}`,
        name: request.name,
        startsAt: request.startsAt,
        maximumCapacity: request.maximumCapacity,
        admittedCount: 0,
        rounds: request.rounds.map((round, index) => ({
          ...roomFixture().rounds[0],
          id: `round-${index + 1}`,
          position: index + 1,
          startingPrice: `${round.startingPrice}.00`,
          currentPrice: `${round.startingPrice}.00`,
          entries: round.entries,
        })),
      });
      rooms.push(room);

      return Promise.resolve(room);
    },
  };
}

/** Contenedor completo con dobles. Las pruebas cambian solo lo que les interesa. */
export function createTestContainer(
  overrides: Partial<Container> = {},
): Container {
  return {
    tokens: createTokenStore(),
    sessionLost: createSessionChannel(),
    auth: createFakeAuthGateway(STUDENT),
    items: createFakeItemGateway(),
    lots: createFakeLotGateway(),
    media: createFakeMediaGateway(),
    wallet: createFakeWalletGateway(),
    // Sin rivales ni reloj propio: las pruebas no dependen del azar ni del tiempo real.
    auctions: createDemoAuctionGateway({ rivals: false, tickMs: 0 }),
    rooms: createFakeRoomGateway(),
    ...overrides,
  };
}

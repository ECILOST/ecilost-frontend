import type { Container } from '@/app/container';
import { Role } from '@/features/auth/domain/role';
import type {
  AccessTokenResponse,
  Principal,
} from '@/features/auth/model/session';
import type { AuthGateway } from '@/features/auth/ports/auth.gateway';
import { ItemCondition } from '@/features/catalog/domain/item-condition';
import { ItemStatus } from '@/features/catalog/domain/item-status';
import type {
  ItemDetail,
  ItemFicha,
  ItemSummary,
  ItemView,
  ListItemsQuery,
} from '@/features/catalog/model/item';
import type { ItemGateway } from '@/features/catalog/ports/item.gateway';
import { MediaKind, type MediaAsset } from '@/features/media/model/media';
import type { MediaGateway } from '@/features/media/ports/media.gateway';
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
  canBid: true,
};

export const STAFF: Principal = {
  userId: 'user-staff',
  role: Role.STAFF,
  canManageCatalog: true,
  canScheduleRooms: true,
  canBid: false,
};

const UNAUTHENTICATED = new ApiError({
  type: ProblemType.UNAUTHENTICATED,
  title: 'Sin sesion',
  status: 401,
});

export function itemFixture(overrides: Partial<ItemSummary> = {}): ItemSummary {
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
    ...overrides,
  };
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
  return {
    ...itemFixture(),
    photos: [photoFixture()],
    video: null,
    ...overrides,
  };
}

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
    profile: () => Promise.reject(new Error('no lo usa esta prueba')),
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
}

export function createFakeItemGateway(catalog: FakeCatalog = {}): ItemGateway {
  const items = catalog.items ?? [];
  const views = catalog.views ?? {};
  const calls = catalog.calls ?? [];

  return {
    list: (query: ListItemsQuery = {}) => {
      calls.push(query);
      const filtered = query.status
        ? items.filter((item) => item.status === query.status)
        : items;
      return Promise.resolve(filtered);
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
    create: () => Promise.reject(new Error('no lo usa esta prueba')),
    update: () => Promise.reject(new Error('no lo usa esta prueba')),
    remove: () => Promise.resolve(),
  };
}

export function createFakeMediaGateway(): MediaGateway {
  return {
    upload: () => Promise.resolve(photoFixture({ id: 'media-subida' })),
    remove: () => Promise.resolve(),
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
    media: createFakeMediaGateway(),
    ...overrides,
  };
}

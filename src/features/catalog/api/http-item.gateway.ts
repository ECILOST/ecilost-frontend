import type { HttpClient } from '@/shared/api/http-client';
import type {
  CreateItemRequest,
  ItemSummary,
  ItemView,
  ListItemsQuery,
  UpdateItemRequest,
} from '../model/item';
import type { ItemGateway } from '../ports/item.gateway';

/** Adaptador HTTP del catalogo, contra ecilost-catalog-service. */
export function createHttpItemGateway(http: HttpClient): ItemGateway {
  return {
    list: (query: ListItemsQuery = {}) =>
      http.get<ItemSummary[]>('/items', {
        // El cliente descarta los filtros sin valor, asi que aqui se pasan tal cual.
        query: { ...query },
      }),

    findById: (id: string) => http.get<ItemView>(`/items/${id}`),

    create: (request: CreateItemRequest) =>
      http.post<ItemSummary>('/items', request),

    update: (id: string, request: UpdateItemRequest) =>
      http.patch<ItemSummary>(`/items/${id}`, request),

    remove: (id: string, version: number) =>
      http.delete<void>(`/items/${id}`, { query: { version } }),
  };
}

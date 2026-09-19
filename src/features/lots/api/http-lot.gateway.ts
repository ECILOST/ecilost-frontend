import type { HttpClient } from '@/shared/api/http-client';
import type { CreateLotRequest, Lot } from '../model/lot';
import type { LotGateway } from '../ports/lot.gateway';

/** Adaptador HTTP de lotes, contra ecilost-catalog-service. */
export function createHttpLotGateway(http: HttpClient): LotGateway {
  return {
    list: () => http.get<Lot[]>('/lots'),

    findById: (id: string) => http.get<Lot>(`/lots/${id}`),

    create: (request: CreateLotRequest) => http.post<Lot>('/lots', request),
  };
}

import type { HttpClient } from '@/shared/api/http-client';
import type { CreateLotRequest, Lot, LotPhoto } from '../model/lot';
import type { LotGateway } from '../ports/lot.gateway';

/** Adaptador HTTP de lotes, contra ecilost-catalog-service. */
export function createHttpLotGateway(http: HttpClient): LotGateway {
  return {
    list: (ids?: string[]) =>
      http.get<Lot[]>('/lots', { query: { ids: ids?.join(',') } }),

    findById: (id: string) => http.get<Lot>(`/lots/${id}`),

    create: (request: CreateLotRequest) => http.post<Lot>('/lots', request),

    uploadPhoto(lotId: string, file: File) {
      // El campo se llama `file`, como en la multimedia de objetos: asi lo espera el servicio.
      const form = new FormData();
      form.append('file', file);
      return http.post<LotPhoto>(`/lots/${lotId}/photos`, form);
    },

    removePhoto: (lotId: string, photoId: string) =>
      http.delete<void>(`/lots/${lotId}/photos/${photoId}`),
  };
}

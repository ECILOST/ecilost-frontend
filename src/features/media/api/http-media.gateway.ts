import type { HttpClient } from '@/shared/api/http-client';
import type { MediaAsset } from '../model/media';
import type { MediaGateway } from '../ports/media.gateway';

/** Adaptador HTTP de multimedia, contra ecilost-catalog-service. */
export function createHttpMediaGateway(http: HttpClient): MediaGateway {
  return {
    upload(itemId: string, file: File) {
      // El campo se llama `file` porque asi lo espera el interceptor del servicio; con otro
      // nombre la peticion llega sin archivo y responde 400.
      const form = new FormData();
      form.append('file', file);
      return http.post<MediaAsset>(`/items/${itemId}/media`, form);
    },

    remove: (itemId: string, mediaId: string) =>
      http.delete<void>(`/items/${itemId}/media/${mediaId}`),
  };
}

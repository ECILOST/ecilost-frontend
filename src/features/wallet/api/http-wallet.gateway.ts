import { ApiError } from '@/shared/api/problem-details';
import type { HttpClient } from '@/shared/api/http-client';
import type { RechargeRequest, RechargeResult, Wallet } from '../model/wallet';
import type { WalletGateway } from '../ports/wallet.gateway';

/**
 * Adaptador HTTP de la billetera, contra ecilost-wallet-service.
 *
 * Las rutas son relativas porque la base ya trae el prefijo del servicio (ver
 * `src/config/env.ts`): aqui `/me` es el `GET /wallet/me` documentado.
 */
export function createHttpWalletGateway(http: HttpClient): WalletGateway {
  return {
    /**
     * Leer, y provisionar solo si hace falta.
     *
     * El servicio separa las dos cosas a proposito: `GET /me` no crea nada, porque un GET
     * que escribe convierte cada refresco de pantalla en una escritura. Cuando la persona
     * entra por primera vez todavia no tiene billetera, y ese 404 es la señal de que hay
     * que emitirla. Pasa una sola vez en la vida de cada cuenta, asi que el camino normal
     * es una sola peticion.
     *
     * La rama vive en el adaptador y no en la pantalla porque es un detalle de como habla
     * este servicio, no del caso de uso: lo que la aplicacion pide es "mi billetera".
     */
    async mine() {
      try {
        return await http.get<Wallet>('/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return http.post<Wallet>('/me/bootstrap');
        }
        throw error;
      }
    },

    recharge: (userId: string, request: RechargeRequest) =>
      http.post<RechargeResult>(`/${userId}/recharges`, request),
  };
}

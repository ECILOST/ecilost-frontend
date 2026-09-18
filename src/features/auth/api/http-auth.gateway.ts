import type { HttpClient } from '@/shared/api/http-client';
import type {
  AccessTokenResponse,
  Principal,
  Profile,
  UpdateProfileRequest,
} from '../model/session';
import type { AuthGateway } from '../ports/auth.gateway';

/**
 * Adaptador HTTP del puerto de identidad, contra ecilost-auth-service.
 *
 * Las rutas son relativas porque la base ya trae el prefijo `/auth` (ver
 * `src/config/env.ts`): aqui `/token` es el `POST /auth/token` documentado por el servicio.
 */
export function createHttpAuthGateway(http: HttpClient): AuthGateway {
  /**
   * Un solo canje en vuelo.
   *
   * El servicio revoca la cadena entera si recibe un refresh token ya rotado, y dos
   * llamadas simultaneas son justamente eso: la segunda sale con la cookie vieja porque la
   * respuesta de la primera todavia no la ha reemplazado. Pasa solo con StrictMode en
   * desarrollo, o con dos componentes que arranquen a la vez, y el sintoma seria que la
   * sesion se cierra sola.
   */
  let inFlight: Promise<AccessTokenResponse> | null = null;

  return {
    exchangeSession() {
      if (!inFlight) {
        inFlight = http.post<AccessTokenResponse>('/token').finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },

    me: () => http.get<Principal>('/me'),

    profile: () => http.get<Profile>('/profile'),

    updateProfile: (request: UpdateProfileRequest) =>
      http.patch<Profile>('/profile', request),

    logout: () => http.post<void>('/logout'),

    loginUrl: () => `${http.baseUrl}/google`,
  };
}

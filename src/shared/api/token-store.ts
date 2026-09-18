/**
 * El access token vive en memoria y no en `localStorage`, tal como pide la documentacion de
 * ecilost-auth-service: lo que hay en `localStorage` lo lee cualquier script de la pagina,
 * y el token dura quince minutos justamente para no tener que guardarlo.
 *
 * Es una fabrica y no un singleton de modulo para que cada prueba monte el suyo y no herede
 * el token de la anterior.
 */
export interface TokenStore {
  get(): string | null;
  set(token: string | null): void;
}

export function createTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    get: () => token,
    set: (next) => {
      token = next;
    },
  };
}

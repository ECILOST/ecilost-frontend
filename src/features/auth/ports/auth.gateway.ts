import type {
  AccessTokenResponse,
  Principal,
  Profile,
  UpdateProfileRequest,
  UserLookup,
} from '../model/session';

/**
 * Lo que la aplicacion necesita de la identidad, sin decir por donde llega.
 *
 * Es el equivalente de los `ports/` del back: las pantallas y los hooks dependen de esta
 * interfaz, y quien la implementa (HTTP en la aplicacion, un doble en las pruebas) se
 * decide una sola vez, en `src/app/container.ts`.
 */
export interface AuthGateway {
  /**
   * Canjea la cookie de sesion por un access token.
   *
   * Cada canje **rota** el refresh token, y el servicio trata la presentacion de uno ya
   * rotado como robo: revoca la cadena entera y cierra la sesion. La implementacion debe
   * garantizar que nunca haya dos canjes en vuelo.
   */
  exchangeSession(): Promise<AccessTokenResponse>;

  /** Quien es y que puede hacer. No consulta la base: sale del token. */
  me(): Promise<Principal>;

  profile(): Promise<Profile>;

  /**
   * `GET /auth/users?email=`. Operacion de funcionario.
   *
   * Traduce un correo al `userId` que guardan los demas servicios. Es busqueda exacta y
   * de un solo resultado: sirve para confirmar a quien ya se conoce, no para recorrer el
   * directorio. Rechaza con 404 cuando nadie usa ese correo.
   */
  findUserByEmail(email: string): Promise<UserLookup>;

  updateProfile(request: UpdateProfileRequest): Promise<Profile>;

  /** Revoca la sesion en el servidor y limpia la cookie. */
  logout(): Promise<void>;

  /**
   * Direccion con la que empieza el flujo de Google.
   *
   * Es una navegacion completa del navegador, no una peticion: el servicio responde un 302
   * hacia Google, y un `fetch` se lo comeria sin sacar a nadie de la pagina.
   */
  loginUrl(): string;
}

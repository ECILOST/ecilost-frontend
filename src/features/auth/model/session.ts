import type { Role } from '../domain/role';

/**
 * Contratos de ecilost-auth-service tal como llegan por la red. Son el equivalente de los
 * `dto/` del servicio: lo que se manda y lo que se recibe, sin logica.
 */

/**
 * Respuesta de `POST /auth/token`.
 *
 * Los campos van en snake_case y no en camelCase porque los fija RFC 6749, no el equipo.
 * Se renombran al entrar a la aplicacion, no aqui: este tipo describe el cable.
 */
export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  /** Vida del token en segundos. Con esto se programa la renovacion. */
  expires_in: number;
  role: Role;
}

/**
 * Respuesta de `GET /auth/me`.
 *
 * Las tres banderas existen para que el menu no tenga que traducir el rol a permisos: el
 * dia que un rol nuevo pueda administrar el catalogo, el front no cambia.
 */
export interface Principal {
  userId: string;
  role: Role;
  /** Registrar objetos y crear lotes. */
  canManageCatalog: boolean;
  /** Programar salas de subasta. */
  canScheduleRooms: boolean;
  /** Pujar. Nunca es true a la vez que las anteriores: los roles no se solapan. */
  canBid: boolean;
}

/** Respuesta de `GET /auth/profile`. Los datos de presentacion de la persona. */
export interface Profile {
  userId: string;
  email: string;
  fullName: string;
  /** Puede faltar o caducar: Google rota las direcciones. Siempre con respaldo visual. */
  avatarUrl: string | null;
  institutionalCode: string | null;
  role: Role;
}

/**
 * Cuerpo de `PATCH /auth/profile`.
 *
 * `null` o cadena vacia borran el codigo; omitir el campo lo deja como estaba. Por eso es
 * opcional y ademas anulable: son tres intenciones distintas, no dos.
 */
export interface UpdateProfileRequest {
  institutionalCode?: string | null;
}

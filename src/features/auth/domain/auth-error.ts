/**
 * Capa unica que traduce cualquier fallo de la entrada a un mensaje para la persona.
 *
 * Los motivos llegan por tres vias y todos pasan por aqui:
 *  1. `?error=<codigo>` en la vuelta de Google. Exito y rechazo comparten el codigo HTTP (los
 *     dos son un 302) y solo se distinguen por el destino: el servicio manda al inicio cuando
 *     sale bien y al login, con el motivo, cuando no.
 *  2. El navegador sin conexion, detectado antes de mandar a nadie a Google.
 *  3. La sesion que caduco mientras se usaba la aplicacion (la detecta `SessionProvider`).
 *
 * El texto se escribe en esta tabla y NUNCA se toma del `error_description` que viaja en la
 * misma direccion: ese parametro lo escribe quien arma el enlace, asi que pintarlo tal cual
 * convierte la portada en un cartel que cualquiera puede redactar; y el servicio lo manda
 * sin tildes y en jerga. El codigo tecnico va a la consola, no a la pantalla.
 */

export type LoginErrorKind =
  | 'cancelled'
  | 'offline'
  | 'account_not_allowed'
  | 'forbidden'
  | 'suspended'
  | 'email_not_verified'
  | 'session_expired'
  | 'server';

export interface LoginError {
  kind: LoginErrorKind;
  /** Que paso, en una linea. Es el titulo del aviso. */
  title: string;
  /** Por que y que hacer ahora. */
  message: string;
  /** Texto del boton de recuperacion. Siempre hay uno: nadie se queda sin salida. */
  retryLabel: string;
  /** Sugerencia extra (p. ej. que cuenta usar). Opcional. */
  hint?: string;
}

export const LOGIN_ERRORS: Record<LoginErrorKind, LoginError> = {
  cancelled: {
    kind: 'cancelled',
    title: 'No se completó el inicio de sesión',
    message:
      'Cerraste la ventana de Google o no elegiste una cuenta. No pasa nada: puedes volver a intentarlo cuando quieras.',
    retryLabel: 'Reintentar con Google',
  },
  offline: {
    kind: 'offline',
    title: 'Parece que no tienes conexión',
    message:
      'Revisa tu wifi o tus datos móviles. Cuando vuelvas a tener internet, intenta de nuevo.',
    retryLabel: 'Reintentar',
  },
  account_not_allowed: {
    kind: 'account_not_allowed',
    title: 'No pudimos usar esa cuenta de Google',
    message:
      'Google no nos dejó entrar con la cuenta que elegiste. Vuelve a intentarlo y elige otra de tus cuentas de Google.',
    hint: 'Sirve cualquier cuenta de Google: tu Gmail personal o la de la Escuela.',
    retryLabel: 'Probar con otra cuenta',
  },
  forbidden: {
    kind: 'forbidden',
    title: 'Tu cuenta no tiene acceso',
    message:
      'Tu cuenta existe, pero no tiene permiso para entrar a ECI Lost. Si crees que deberías tenerlo, pide acceso a la oficina de objetos perdidos de la Escuela.',
    retryLabel: 'Reintentar con otra cuenta',
  },
  suspended: {
    kind: 'suspended',
    title: 'Tu cuenta está inactiva',
    message:
      'Tu cuenta está inactiva. Comunícate con la universidad para reactivarla y luego vuelve a entrar.',
    retryLabel: 'Reintentar',
  },
  email_not_verified: {
    kind: 'email_not_verified',
    title: 'Tu correo aún no está verificado',
    message:
      'Tu correo de Google no está verificado. Verifícalo desde tu cuenta de Google y vuelve a entrar.',
    retryLabel: 'Reintentar',
  },
  session_expired: {
    kind: 'session_expired',
    title: 'Tu sesión terminó',
    message:
      'Por seguridad, la sesión se cierra después de un tiempo. Inicia sesión de nuevo para seguir donde ibas.',
    retryLabel: 'Iniciar sesión de nuevo',
  },
  server: {
    kind: 'server',
    title: 'No pudimos iniciar tu sesión',
    message:
      'No fue posible completar el inicio de sesión por un problema de nuestro lado. Inténtalo de nuevo en unos minutos.',
    retryLabel: 'Reintentar',
  },
};

/**
 * Codigos que puede mandar ecilost-auth-service en `?error=`, mas los de OAuth 2.0 (RFC 6749
 * 4.1.2.1) que Google reenvia. Se admite cualquier cuenta de Google; los codigos de dominio
 * quedan por si el servicio llega a rechazar alguna cuenta y se explican sin pedir un dominio
 * concreto. Cualquier otro cae en `server`.
 */
const CODE_TO_KIND: Record<string, LoginErrorKind> = {
  access_denied: 'cancelled',
  user_cancelled: 'cancelled',
  consent_required: 'cancelled',

  domain_not_allowed: 'account_not_allowed',
  email_domain_not_allowed: 'account_not_allowed',
  invalid_domain: 'account_not_allowed',
  unauthorized_domain: 'account_not_allowed',
  hd_mismatch: 'account_not_allowed',

  forbidden: 'forbidden',
  insufficient_permissions: 'forbidden',
  unauthorized_client: 'forbidden',

  account_suspended: 'suspended',
  email_not_verified: 'email_not_verified',

  // La solicitud firmada (state) vence a los pocos minutos: para la persona, es lo mismo
  // que una sesion caducada.
  invalid_request: 'session_expired',
  session_expired: 'session_expired',
  token_expired: 'session_expired',

  server_error: 'server',
  temporarily_unavailable: 'server',
};

/**
 * Que mostrar segun lo que se sabe. El orden importa: sin conexion gana a todo (ningun otro
 * consejo sirve sin red), y un codigo en la direccion gana a la sesion caducada porque es lo
 * ultimo que paso.
 */
export function resolveLoginError({
  code,
  online = true,
  sessionExpired = false,
}: {
  code?: string | null;
  online?: boolean;
  sessionExpired?: boolean;
}): LoginError | null {
  if (!online) return LOGIN_ERRORS.offline;
  if (code) {
    // `hasOwn` y no `in`: un codigo como `constructor` no debe encontrar nada heredado.
    const kind = Object.hasOwn(CODE_TO_KIND, code) ? CODE_TO_KIND[code] : 'server';
    return LOGIN_ERRORS[kind];
  }
  if (sessionExpired) return LOGIN_ERRORS.session_expired;
  return null;
}

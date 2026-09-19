/**
 * Motivos por los que ecilost-auth-service puede rechazar una entrada.
 *
 * Llegan como `?error=<codigo>` en la vuelta de Google, porque exito y rechazo comparten el
 * codigo HTTP (los dos son un 302) y solo se distinguen por el destino: el servicio manda al
 * catalogo cuando sale bien y aqui cuando no.
 *
 * El texto se escribe en esta tabla y NO se toma del `error_description` que viaja en la
 * misma direccion. Por dos razones: ese parametro lo escribe quien arma el enlace, asi que
 * pintarlo tal cual convierte la portada en un cartel que cualquiera puede redactar; y el
 * servicio lo manda sin tildes, igual que el resto de sus mensajes internos.
 */
export const LOGIN_ERROR_MESSAGES = {
  invalid_request:
    'La solicitud de inicio de sesión no es válida o expiró. Vuelve a intentarlo.',
  access_denied:
    'No se completó el inicio de sesión con Google. Si cerraste la ventana sin elegir cuenta, puedes volver a intentarlo.',
  email_not_verified:
    'Tu correo de Google no está verificado. Verifícalo desde tu cuenta de Google y vuelve a entrar.',
  account_suspended:
    'Tu cuenta está inactiva. Comunícate con la universidad para reactivarla.',
  server_error:
    'No fue posible completar el inicio de sesión. Inténtalo de nuevo en unos minutos.',
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;

/**
 * Un codigo que no esta en la tabla cae en el mensaje generico en vez de mostrarse crudo:
 * el valor viene de la direccion, y la persona no tiene nada que hacer con un identificador
 * tecnico que ni siquiera reconocemos.
 */
const UNKNOWN = LOGIN_ERROR_MESSAGES.server_error;

export function loginErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return LOGIN_ERROR_MESSAGES[code as LoginErrorCode] ?? UNKNOWN;
}

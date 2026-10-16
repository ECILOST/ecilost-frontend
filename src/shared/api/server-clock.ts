/**
 * La hora del servidor, para las cuentas atras.
 *
 * Auction responde `serverTime` en el detalle de la sala y en su estado. La diferencia con
 * el reloj del navegador se mide en el instante en que llega la respuesta, no cuando la
 * pantalla la pinta: una respuesta servida de cache minutos despues traeria una hora vieja
 * y la cuenta saltaria. Es una sola diferencia para toda la aplicacion, asi que tambien la
 * usan las pantallas que no reciben `serverTime` (tarjetas, portada, ficha).
 */
let offsetMs = 0;

/** Registra la hora que dio el servidor en una respuesta que acaba de llegar. */
export function recordServerTime(iso: string | null | undefined): void {
  if (!iso) return;
  const at = Date.parse(iso);
  if (!Number.isNaN(at)) offsetMs = at - Date.now();
}

/** Ahora, segun el servidor. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

/** Solo para pruebas. */
export function resetServerClock(): void {
  offsetMs = 0;
}

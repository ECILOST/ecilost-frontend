/**
 * Las fechas llegan como cadenas ISO. Se formatean al mostrarlas y no al recibirlas: el
 * modelo guarda lo que respondio el servicio, y la presentacion es cosa de la pantalla.
 *
 * Todas se muestran en hora de Bogota, este donde este el navegador: las salas, la oficina
 * y quienes pujan estan en la universidad, y una hora de inicio tiene que leerse igual en
 * cualquier equipo. Colombia no tiene horario de verano, asi que el desfase es fijo.
 */
export const APP_TIME_ZONE = 'America/Bogota';
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeZone: APP_TIME_ZONE,
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  // Una fecha invalida no debe tumbar la pantalla entera por un `RangeError`.
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMAT.format(date);
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: APP_TIME_ZONE,
});

/** Fecha con hora, para lo que ocurre a una hora concreta: el inicio de una sala. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_FORMAT.format(date);
}

/** Numero del dia calendario en Bogota: dos instantes del mismo dia dan el mismo numero. */
export function bogotaDay(ms: number): number {
  return Math.floor((ms + BOGOTA_OFFSET_MS) / 86_400_000);
}

/**
 * Lee el valor de un `<input type="datetime-local">` ("2026-10-20T15:00") como hora de
 * Bogota. Sin esto el navegador lo interpreta en su propia zona, y un equipo configurado en
 * otra programaria la sala a una hora distinta de la que muestra la aplicacion.
 */
export function parseBogotaLocal(value: string): Date {
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`${withSeconds}-05:00`);
}

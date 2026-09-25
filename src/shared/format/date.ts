/**
 * Las fechas llegan como cadenas ISO. Se formatean al mostrarlas y no al recibirlas: el
 * modelo guarda lo que respondio el servicio, y la presentacion es cosa de la pantalla.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

export function formatDate(iso: string): string {
  const date = new Date(iso);
  // Una fecha invalida no debe tumbar la pantalla entera por un `RangeError`.
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMAT.format(date);
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Fecha con hora, para lo que ocurre a una hora concreta: el inicio de una sala. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_FORMAT.format(date);
}

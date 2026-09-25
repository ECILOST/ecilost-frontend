/**
 * Reglas de la subasta que la interfaz necesita conocer para no hacer adivinar a nadie.
 */

/**
 * Lo minimo que una puja debe superar al precio vigente cuando la ronda ya tiene lider. Es
 * la regla de ecilost-auction-service, y el demo la imita.
 */
export const BID_INCREMENT = 100;

/** Por debajo de este margen el reloj pasa a "ultimos segundos". */
export const LAST_SECONDS_MS = 10_000;

export function nextBidFor(currentPrice: number): number {
  return currentPrice + BID_INCREMENT;
}

/**
 * La puja minima: la primera de la ronda debe alcanzar el precio minimo; las siguientes, el
 * vigente mas `BID_INCREMENT`. Por encima de eso el estudiante elige el monto.
 */
export function minimumBid(round: {
  startingPrice: number;
  currentPrice: number;
  hasBids: boolean;
}): number {
  return round.hasBids
    ? round.currentPrice + BID_INCREMENT
    : round.startingPrice;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** `08:21` bajo una hora, `02:34:16` por encima. Nunca negativo. */
export function formatCountdown(ms: number, forceHours = false): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0 || forceHours)
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

const TIME = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
});
const DAY = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
});

/** "Mañana · 10:00 a. m.", "Hoy · 3:00 p. m.", "12 abr · 11:20 a. m." */
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  const time = TIME.format(date);
  if (days === 0) return `Hoy · ${time}`;
  if (days === 1) return `Mañana · ${time}`;
  return `${DAY.format(date)} · ${time}`;
}

/** "Hace 12 s", "Hace 4 min", "Hace 2 h". */
export function formatAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(
    0,
    Math.round((now - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return `Hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} d`;
}

export const roomNumber = (name: string) => name.replace(/^Sala\s+/i, '');

/** Fraccion de la ronda que queda (0..1), para el aro del reloj. */
export function roundProgress(
  startedAt: string | null | undefined,
  endsAt: string | null | undefined,
  remainingMs: number,
): number {
  if (!startedAt || !endsAt) return 0;
  const total = new Date(endsAt).getTime() - new Date(startedAt).getTime();
  return total > 0 ? remainingMs / total : 0;
}

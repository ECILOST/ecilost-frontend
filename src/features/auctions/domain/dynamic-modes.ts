import type { PillTone } from '@/shared/components/ui/pill';
import type { DutchSchedule, RoundMode, SpinSegment } from '../model/auction';

/**
 * Subastas dinamicas: como se presenta cada modalidad. Un color por modalidad, el mismo en la
 * ruleta, en el anuncio y en la sala, para que se reconozca antes de leer (direccion visual:
 * "un color = un significado").
 */
export interface ModeMeta {
  label: string;
  /** Nombre en dos lineas para el anuncio a pantalla completa. */
  title: [string, string];
  tagline: string;
  rules: [string, string, string];
  /** Variable CSS del color de la modalidad. */
  color: string;
  tone: PillTone;
  glyph: string;
}

export const MODE_META: Record<Exclude<RoundMode, 'CLASSIC'>, ModeMeta> = {
  DUTCH: {
    label: 'Holandesa',
    title: ['Subasta', 'holandesa'],
    tagline: 'El precio baja. El primero que lo quiera, se lo lleva.',
    rules: [
      'El precio arranca alto y baja cada pocos segundos',
      'Pulsa «¡Lo quiero!» y es tuyo al instante',
      'Todos ven el mismo precio a la vez',
    ],
    color: 'var(--eci-pink)',
    tone: 'pink',
    glyph: '↘',
  },
  SEALED: {
    label: 'Sobre cerrado',
    title: ['Sobre', 'cerrado'],
    tagline: 'Una puja, a ciegas. Pura estrategia.',
    rules: [
      'Puedes pujar una sola vez',
      'Nadie ve las pujas de los demás',
      'Al cerrar, gana la puja más alta',
    ],
    color: 'var(--eci-blue)',
    tone: 'blue',
    glyph: '✉',
  },
  MYSTERY: {
    label: 'Lote misterioso',
    title: ['Lote', 'misterioso'],
    tagline: 'No sabrás qué es hasta ganarlo.',
    rules: [
      'Solo ves pistas del objeto',
      'Pujas como siempre: gana la más alta',
      'Se revela únicamente a quien gane',
    ],
    color: 'var(--eci-purple)',
    tone: 'purple',
    glyph: '?',
  },
};

/** El comodin es un segmento de la ruleta, no una modalidad. */
export const WILDCARD_META = {
  label: 'Comodín',
  tagline: 'La ruleta vuelve a girar.',
  color: 'var(--eci-yellow)',
  glyph: '↻',
} as const;

export function segmentMeta(segment: SpinSegment) {
  return segment === 'WILDCARD' ? WILDCARD_META : MODE_META[segment];
}

export const isDynamic = (mode: RoundMode): mode is Exclude<RoundMode, 'CLASSIC'> => mode !== 'CLASSIC';

/** En estas modalidades no hay pujas ascendentes, puja automatica ni compra inmediata. */
export const acceptsAscendingBids = (mode: RoundMode) => mode === 'CLASSIC' || mode === 'MYSTERY';

/**
 * Precio holandes a una hora dada. Es lo mismo que calcula ecilost-auction-service con el
 * reloj de la base; aqui solo se pinta, el cobro lo decide el servidor al cerrar.
 */
export function dutchPriceAt(schedule: DutchSchedule, startedAt: string, nowMs: number): number {
  const steps = Math.max(0, Math.floor((nowMs - Date.parse(startedAt)) / 1000 / schedule.intervalSeconds));
  return Math.max(schedule.floorPrice, schedule.startPrice - schedule.step * steps);
}

/** Cuanto falta para la proxima bajada y que fraccion del intervalo ya paso. */
export function dutchNextDrop(schedule: DutchSchedule, startedAt: string, nowMs: number) {
  const current = dutchPriceAt(schedule, startedAt, nowMs);
  if (current <= schedule.floorPrice) return { inMs: null, progress: 1, nextPrice: null };
  const intervalMs = schedule.intervalSeconds * 1000;
  const elapsed = Math.max(0, nowMs - Date.parse(startedAt)) % intervalMs;
  return {
    inMs: intervalMs - elapsed,
    progress: elapsed / intervalMs,
    nextPrice: Math.max(schedule.floorPrice, current - schedule.step),
  };
}

/** Los ultimos precios por los que ya paso la ronda, del mas alto al mas reciente. */
export function dutchHistory(schedule: DutchSchedule, startedAt: string, nowMs: number, size = 3): number[] {
  const current = dutchPriceAt(schedule, startedAt, nowMs);
  const passed: number[] = [];
  for (let price = current + schedule.step; price <= schedule.startPrice && passed.length < size; price += schedule.step) {
    passed.unshift(price);
  }
  return passed;
}

/** Rondas cuyo anuncio ya no tiene sentido mostrar: empezaron hace mas de esto. */
export const ANNOUNCE_WINDOW_MS = 15_000;

/** Lo que hay que animar cuando el dueño giro la ruleta de una ronda que aun no empieza. */
export interface RouletteSpin {
  roundId: string;
  position: number;
  segment: SpinSegment;
}

/**
 * Que giro la ruleta entre dos estados de la sala. El canal empuja estados completos: un
 * comodin se nota porque crecen los comodines de la ronda; una modalidad, porque la ronda pasa
 * a tener el modo fijado.
 */
export function detectRouletteSpin(
  before: { id: string; modeLocked: boolean; wildcardSpins: number }[],
  now: { id: string; position: number; status: string; mode: RoundMode; modeLocked: boolean; wildcardSpins: number }[],
): RouletteSpin | null {
  for (const round of now) {
    if (round.status !== 'SCHEDULED') continue;
    const old = before.find((candidate) => candidate.id === round.id);
    if (!old) continue;
    if (!old.modeLocked && round.modeLocked && isDynamic(round.mode)) {
      return { roundId: round.id, position: round.position, segment: round.mode };
    }
    if (round.wildcardSpins > old.wildcardSpins) {
      return { roundId: round.id, position: round.position, segment: 'WILDCARD' };
    }
  }
  return null;
}

/**
 * Si al ver esta ronda activa toca anunciar su modalidad a pantalla completa: solo si es
 * dinamica y acaba de empezar. Entrar tarde a una ronda empezada no repite el anuncio.
 */
export function shouldAnnounce(
  round: { mode: RoundMode; status: string; startedAt: string | null } | null,
  nowMs: number,
): boolean {
  if (!round || round.status !== 'ACTIVE' || !isDynamic(round.mode) || !round.startedAt) return false;
  return nowMs - Date.parse(round.startedAt) < ANNOUNCE_WINDOW_MS;
}

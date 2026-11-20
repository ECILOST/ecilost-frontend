import type { IconName } from '@/shared/components/ui/icon';
import type {
  LeaderboardEntry,
  MedalId,
  MedalProgress,
} from '../model/gamification';

export interface MedalMeta {
  name: string;
  /** Como se gana, en una frase: es lo que dice el tooltip y la tarjeta. */
  description: string;
  icon: IconName;
  /** Variable CSS del color. Las de modalidad usan el mismo color que su modalidad. */
  color: string;
}

/**
 * Catalogo de medallas. El servicio solo manda identificadores; nombre, icono y color se
 * deciden aqui para que una medalla se vea igual en el perfil, en el top y en la sala.
 */
export const MEDALS: Record<MedalId, MedalMeta> = {
  FIRST_WIN: {
    name: 'Primera victoria',
    description: 'Ganaste tu primera subasta.',
    icon: 'trophy',
    color: 'var(--eci-green)',
  },
  DUTCH_KING: {
    name: 'Rey de la holandesa',
    description: 'Ganaste 5 subastas holandesas.',
    icon: 'trend-down',
    color: 'var(--eci-pink)',
  },
  PERFECT_SEAL: {
    name: 'Sobre perfecto',
    description:
      'Ganaste un sobre cerrado por menos de 10 ECICoin sobre el segundo.',
    icon: 'mail',
    color: 'var(--eci-blue-text)',
  },
  STREAK_3: {
    name: 'Racha de 3',
    description: 'Ganaste al menos una subasta tres semanas seguidas.',
    icon: 'flame',
    color: 'var(--eci-orange)',
  },
  DETECTIVE: {
    name: 'Detective',
    description: 'Ganaste 3 lotes misteriosos.',
    icon: 'search',
    color: 'var(--eci-purple-text)',
  },
  COLLECTOR: {
    name: 'Coleccionista',
    description: 'Ganaste en las cuatro modalidades.',
    icon: 'sparkle',
    color: 'var(--eci-cyan)',
  },
  LAST_SECOND: {
    name: 'Último segundo',
    description: 'Tu puja ganadora llegó en los últimos 3 segundos.',
    icon: 'timer',
    color: 'var(--eci-yellow)',
  },
  WEEKLY_PODIUM: {
    name: 'Top 3 semanal',
    description: 'Terminaste una semana en el podio.',
    icon: 'star',
    color: 'var(--eci-yellow)',
  },
};

const MEDAL_IDS = new Set(Object.keys(MEDALS));

export const isMedalId = (value: unknown): value is MedalId =>
  typeof value === 'string' && MEDAL_IDS.has(value);

/**
 * Lo que llega por la red, reducido a medallas conocidas. Una medalla nueva en el servicio
 * que este front todavia no conoce se ignora en vez de pintarse sin nombre ni icono.
 */
export function toMedalIds(value: unknown, max = 2): MedalId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isMedalId))].slice(0, max);
}

export const isUnlocked = (medal: MedalProgress) => medal.unlockedAt !== null;

/**
 * Orden de la grilla: primero las desbloqueadas (la mas reciente antes), despues las que
 * faltan, las mas avanzadas primero. Asi lo primero que se ve es lo logrado y lo siguiente
 * que esta a la mano.
 */
export function sortMedals(medals: MedalProgress[]): MedalProgress[] {
  return [...medals].sort((a, b) => {
    if (isUnlocked(a) !== isUnlocked(b)) return isUnlocked(a) ? -1 : 1;
    if (a.unlockedAt && b.unlockedAt)
      return b.unlockedAt.localeCompare(a.unlockedAt);
    return b.progress / b.goal - a.progress / a.goal;
  });
}

/** La medalla bloqueada mas cercana, para la tarjeta "Siguiente". */
export function nextMedal(medals: MedalProgress[]): MedalProgress | null {
  const locked = medals.filter(
    (medal) => !isUnlocked(medal) && medal.progress > 0,
  );
  return sortMedals(locked)[0] ?? null;
}

/**
 * Victorias que le faltan a quien mira para entrar al podio. El top se ordena por victorias
 * y, en empate, por quien gasto menos; como el gasto no se sabe de antemano, se cuenta lo
 * que asegura el puesto: una victoria mas que el tercero. `null` si ya esta en el podio o
 * si no hay podio todavia.
 */
export function winsToPodium(
  entries: LeaderboardEntry[],
  me: LeaderboardEntry | null,
): number | null {
  const third = entries.find((entry) => entry.rank === 3);
  if (!third) return null;
  if (me && me.rank <= 3) return null;
  return Math.max(1, third.wins - (me?.wins ?? 0) + 1);
}

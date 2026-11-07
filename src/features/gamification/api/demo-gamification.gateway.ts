import type {
  Leaderboard,
  LeaderboardEntry,
  LeaderboardWeek,
  StudentProfile,
} from '../model/gamification';
import type { GamificationGateway } from '../ports/gamification.gateway';

/**
 * Perfil y top en memoria, para el modo demo (`VITE_AUCTIONS_DEMO=true`) y las pruebas.
 * Los datos son fijos: las pruebas no pueden depender del azar.
 */

const DAY = 24 * 60 * 60 * 1000;

function mondayOf(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

const iso = (time: number) => new Date(time).toISOString();

type Row = [
  alias: string,
  wins: number,
  bids: number,
  spent: number,
  mode: LeaderboardEntry['favoriteMode'],
  badges: LeaderboardEntry['badges'],
];

const CURRENT: Row[] = [
  ['gata-lunar', 6, 19, 1480, 'DUTCH', ['DUTCH_KING', 'LAST_SECOND']],
  ['zorro-rojo', 5, 15, 1120, 'SEALED', ['PERFECT_SEAL']],
  ['tucan-veloz', 4, 13, 890, 'MYSTERY', ['DETECTIVE']],
  ['buho-nocturno', 3, 14, 620, 'DUTCH', ['DUTCH_KING', 'STREAK_3']],
  ['ardilla-gris', 3, 22, 710, 'CLASSIC', []],
  ['colibri-zen', 2, 9, 300, 'SEALED', ['PERFECT_SEAL']],
  ['lobo-andino', 2, 17, 520, 'CLASSIC', []],
  ['nutria-feliz', 2, 8, 410, 'MYSTERY', ['DETECTIVE']],
  ['pulpo-astuto', 1, 12, 240, 'DUTCH', []],
  ['oso-de-anteojos', 1, 6, 180, 'DUTCH', ['STREAK_3']],
];

const PREVIOUS: Row[] = [
  ['zorro-rojo', 5, 16, 1010, 'SEALED', ['PERFECT_SEAL', 'STREAK_3']],
  ['buho-nocturno', 4, 12, 760, 'DUTCH', ['DUTCH_KING']],
  ['lobo-andino', 3, 14, 640, 'CLASSIC', []],
  ['gata-lunar', 3, 19, 820, 'DUTCH', ['LAST_SECOND']],
  ['colibri-zen', 3, 11, 450, 'SEALED', ['PERFECT_SEAL']],
  ['tucan-veloz', 2, 15, 500, 'MYSTERY', ['DETECTIVE']],
  ['ardilla-gris', 2, 20, 610, 'CLASSIC', []],
  ['pulpo-astuto', 1, 9, 200, 'DUTCH', []],
  ['nutria-feliz', 1, 7, 150, 'MYSTERY', []],
  ['oso-de-anteojos', 1, 5, 120, 'DUTCH', []],
];

export const DEMO_ALIAS = 'buho-nocturno';

export function createDemoGamificationGateway({
  latencyMs = 0,
  now = () => Date.now(),
}: { latencyMs?: number; now?: () => number } = {}): GamificationGateway {
  const wait = <T>(value: T) =>
    latencyMs > 0
      ? new Promise<T>((resolve) => setTimeout(() => resolve(value), latencyMs))
      : Promise.resolve(value);

  function leaderboard(week: LeaderboardWeek): Leaderboard {
    const monday =
      mondayOf(new Date(now())).getTime() - (week === 'previous' ? 7 * DAY : 0);
    const rows = week === 'current' ? CURRENT : PREVIOUS;
    const entries = rows.map(
      (
        [alias, wins, bids, spent, favoriteMode, badges],
        index,
      ): LeaderboardEntry => ({
        rank: index + 1,
        alias,
        wins,
        bids,
        spent,
        favoriteMode,
        badges,
        mine: alias === DEMO_ALIAS,
      }),
    );
    return {
      week,
      from: iso(monday),
      to: iso(monday + 6 * DAY),
      entries,
      me: entries.find((entry) => entry.mine) ?? null,
      updatedAt: iso(now() - 8000),
    };
  }

  function profile(): StudentProfile {
    const t = now();
    return {
      alias: DEMO_ALIAS,
      bids: 87,
      wins: 12,
      spent: 4350,
      streakWeeks: 3,
      favoriteMode: 'DUTCH',
      favoriteModeBids: 31,
      weeklyRank: 4,
      medals: [
        {
          id: 'FIRST_WIN',
          unlockedAt: iso(t - 60 * DAY),
          progress: 1,
          goal: 1,
        },
        {
          id: 'DUTCH_KING',
          unlockedAt: iso(t - 2 * 60 * 1000),
          progress: 5,
          goal: 5,
        },
        {
          id: 'PERFECT_SEAL',
          unlockedAt: iso(t - 12 * DAY),
          progress: 1,
          goal: 1,
        },
        { id: 'STREAK_3', unlockedAt: iso(t - 3 * DAY), progress: 3, goal: 3 },
        { id: 'DETECTIVE', unlockedAt: null, progress: 1, goal: 3 },
        { id: 'COLLECTOR', unlockedAt: null, progress: 3, goal: 4 },
        { id: 'LAST_SECOND', unlockedAt: null, progress: 0, goal: 1 },
        { id: 'WEEKLY_PODIUM', unlockedAt: null, progress: 0, goal: 1 },
      ],
      modes: [
        { mode: 'DUTCH', played: 11, won: 5 },
        { mode: 'CLASSIC', played: 30, won: 4 },
        { mode: 'SEALED', played: 9, won: 2 },
        { mode: 'MYSTERY', played: 6, won: 1 },
      ],
      recent: [
        ['r-1', 'Calculadora Casio fx-991', 'DUTCH', 180, 'WON', 10],
        ['r-2', 'Chaqueta azul talla M', 'SEALED', 95, 'LOST', 26 * 60],
        ['r-3', 'Termo Stanley', 'MYSTERY', 240, 'WON', 3 * 24 * 60],
        ['r-4', 'Audífonos JBL', 'CLASSIC', 410, 'LOST', 5 * 24 * 60],
        ['r-5', 'Paraguas negro', 'DUTCH', 60, 'LOST', 7 * 24 * 60],
      ].map(([id, itemName, mode, amount, result, minutesAgo]) => ({
        roundId: id as string,
        roomId: 'sala-demo',
        itemId: `item-${id as string}`,
        itemName: itemName as string,
        imageUrl: null,
        mode: mode as StudentProfile['recent'][number]['mode'],
        amount: amount as number,
        result: result as 'WON' | 'LOST',
        at: iso(t - (minutesAgo as number) * 60 * 1000),
      })),
      updatedAt: iso(t - 8000),
    };
  }

  return {
    myProfile: () => wait(profile()),
    leaderboard: (week) => wait(leaderboard(week)),
  };
}

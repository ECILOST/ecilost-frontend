import type { RoundMode } from '@/features/auctions/model/auction';
import type { HttpClient } from '@/shared/api/http-client';
import { ApiError } from '@/shared/api/problem-details';
import { isMedalId, toMedalIds } from '../domain/medals';
import type {
  Leaderboard,
  LeaderboardEntry,
  LeaderboardWeek,
  MedalProgress,
  ModeStat,
  ProfileAuction,
  StudentProfile,
} from '../model/gamification';
import type { GamificationGateway } from '../ports/gamification.gateway';

/*
 * Contratos de ecilost-engagement-service tal como viajan. Las cifras de ECICoin llegan como
 * texto decimal, igual que en la billetera; aqui se convierten porque el perfil solo las
 * muestra redondeadas, no opera con ellas.
 */
interface ProfileWire {
  alias: string;
  stats: {
    bids: number;
    wins: number;
    spent: string | number;
    streakWeeks: number;
    favoriteMode: string | null;
    favoriteModeBids?: number;
  };
  weeklyRank: number | null;
  medals: Array<{
    id: string;
    unlockedAt: string | null;
    progress: number;
    goal: number;
  }>;
  modes: Array<{ mode: string; played: number; won: number }>;
  recent: Array<{
    roundId: string;
    roomId: string;
    itemId: string;
    itemName: string;
    imageUrl?: string | null;
    mode: string;
    amount: string | number;
    result: string;
    at: string;
  }>;
  updatedAt: string;
}

interface EntryWire {
  rank: number;
  alias: string;
  wins: number;
  bids: number;
  spent: string | number;
  favoriteMode: string | null;
  badges?: string[];
  mine?: boolean;
}

interface LeaderboardWire {
  week: LeaderboardWeek;
  from: string;
  to: string;
  entries: EntryWire[];
  me: EntryWire | null;
  updatedAt: string;
}

const MODES: readonly RoundMode[] = ['CLASSIC', 'DUTCH', 'SEALED', 'MYSTERY'];
const toMode = (value: string | null | undefined): RoundMode | null =>
  MODES.includes(value as RoundMode) ? (value as RoundMode) : null;

const toNumber = (value: string | number) => Math.round(Number(value) || 0);

/**
 * Perfil de quien todavia no ha participado. Engagement crea el documento con el primer
 * evento, asi que antes de pujar no existe: ese 404 no es un fallo, es un perfil en cero.
 */
export function emptyProfile(now = new Date().toISOString()): StudentProfile {
  return {
    alias: '',
    bids: 0,
    wins: 0,
    spent: 0,
    streakWeeks: 0,
    favoriteMode: null,
    favoriteModeBids: 0,
    weeklyRank: null,
    medals: [],
    modes: [],
    recent: [],
    updatedAt: now,
  };
}

export function toProfile(wire: ProfileWire): StudentProfile {
  return {
    alias: wire.alias,
    bids: wire.stats.bids,
    wins: wire.stats.wins,
    spent: toNumber(wire.stats.spent),
    streakWeeks: wire.stats.streakWeeks,
    favoriteMode: toMode(wire.stats.favoriteMode),
    favoriteModeBids: wire.stats.favoriteModeBids ?? 0,
    weeklyRank: wire.weeklyRank,
    medals: wire.medals
      .filter((medal) => isMedalId(medal.id))
      .map((medal): MedalProgress => ({
        id: medal.id as MedalProgress['id'],
        unlockedAt: medal.unlockedAt,
        goal: Math.max(1, medal.goal),
        progress: Math.min(
          Math.max(0, medal.progress),
          Math.max(1, medal.goal),
        ),
      })),
    modes: wire.modes.flatMap((stat): ModeStat[] => {
      const mode = toMode(stat.mode);
      return mode ? [{ mode, played: stat.played, won: stat.won }] : [];
    }),
    recent: wire.recent.flatMap((entry): ProfileAuction[] => {
      const mode = toMode(entry.mode);
      if (!mode) return [];
      return [
        {
          roundId: entry.roundId,
          roomId: entry.roomId,
          itemId: entry.itemId,
          itemName: entry.itemName,
          imageUrl: entry.imageUrl ?? null,
          mode,
          amount: toNumber(entry.amount),
          result: entry.result === 'WON' ? 'WON' : 'LOST',
          at: entry.at,
        },
      ];
    }),
    updatedAt: wire.updatedAt,
  };
}

const toEntry = (wire: EntryWire): LeaderboardEntry => ({
  rank: wire.rank,
  alias: wire.alias,
  wins: wire.wins,
  bids: wire.bids,
  spent: toNumber(wire.spent),
  favoriteMode: toMode(wire.favoriteMode),
  badges: toMedalIds(wire.badges),
  mine: wire.mine === true,
});

export function toLeaderboard(wire: LeaderboardWire): Leaderboard {
  return {
    week: wire.week,
    from: wire.from,
    to: wire.to,
    entries: wire.entries.map(toEntry).sort((a, b) => a.rank - b.rank),
    me: wire.me ? { ...toEntry(wire.me), mine: true } : null,
    updatedAt: wire.updatedAt,
  };
}

/**
 * Adaptador HTTP contra ecilost-engagement-service. La base ya trae el prefijo del servicio
 * (`/api/engagement`), asi que `/profiles/me` es el endpoint tal cual.
 */
export function createHttpGamificationGateway(
  http: HttpClient,
): GamificationGateway {
  return {
    async myProfile() {
      try {
        return toProfile(await http.get<ProfileWire>('/profiles/me'));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404)
          return emptyProfile();
        throw error;
      }
    },
    async leaderboard(week) {
      return toLeaderboard(
        await http.get<LeaderboardWire>('/leaderboard', { query: { week } }),
      );
    },
  };
}

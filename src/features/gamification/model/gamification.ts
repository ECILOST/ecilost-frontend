import type { RoundMode } from '@/features/auctions/model/auction';

/**
 * Perfil del estudiante, top semanal y medallas.
 *
 * Todo esto lo sirve ecilost-engagement-service desde un **modelo de lectura** (un documento
 * por estudiante en MongoDB) que se alimenta de los eventos `BidPlaced` y `RoundAwarded` que
 * ya viajan por RabbitMQ. Es consistencia eventual a proposito: el documento se pone al dia
 * unos segundos despues de que cierra la ronda, y por eso cada respuesta trae `updatedAt`
 * para decirle a quien mira de cuando es lo que ve.
 */

/** Medallas que existen. El catalogo (nombre, icono, color) vive en `domain/medals.ts`. */
export type MedalId =
  | 'FIRST_WIN'
  | 'DUTCH_KING'
  | 'PERFECT_SEAL'
  | 'STREAK_3'
  | 'DETECTIVE'
  | 'COLLECTOR'
  | 'LAST_SECOND'
  | 'WEEKLY_PODIUM';

/** Una medalla del perfil: desbloqueada (con fecha) o en camino (con avance). */
export interface MedalProgress {
  id: MedalId;
  /** Cuando se desbloqueo; `null` si todavia no. */
  unlockedAt: string | null;
  /** Avance hacia la meta, de 0 a `goal`. */
  progress: number;
  goal: number;
}

/** Rondas jugadas y ganadas en una modalidad. */
export interface ModeStat {
  mode: RoundMode;
  played: number;
  won: number;
}

/** Una de las ultimas subastas en las que participo. */
export interface ProfileAuction {
  roundId: string;
  roomId: string;
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  mode: RoundMode;
  /** Lo que pago si gano, o su ultima oferta si no. */
  amount: number;
  result: 'WON' | 'LOST';
  at: string;
}

export interface StudentProfile {
  /**
   * Alias publico, el que se ve en el top semanal. No es el de la sala (ese cambia en cada
   * sala) ni el nombre real: el ranking es publico y no debe exponer a nadie.
   */
  alias: string;
  bids: number;
  wins: number;
  /** ECICoin pagados en subastas ganadas. */
  spent: number;
  /** Semanas seguidas ganando al menos una subasta. */
  streakWeeks: number;
  favoriteMode: RoundMode | null;
  /** Bids en la modalidad favorita, para decir "31 de tus 87 pujas". */
  favoriteModeBids: number;
  /** Puesto en el top de esta semana; `null` si todavia no gano nada esta semana. */
  weeklyRank: number | null;
  medals: MedalProgress[];
  modes: ModeStat[];
  recent: ProfileAuction[];
  /** Hasta donde llega el modelo de lectura. */
  updatedAt: string;
}

export type LeaderboardWeek = 'current' | 'previous';

export interface LeaderboardEntry {
  rank: number;
  alias: string;
  wins: number;
  bids: number;
  spent: number;
  favoriteMode: RoundMode | null;
  /** Hasta dos medallas para lucir junto al alias. */
  badges: MedalId[];
  mine: boolean;
}

export interface Leaderboard {
  week: LeaderboardWeek;
  /** Lunes y domingo de la semana, en ISO. */
  from: string;
  to: string;
  /** Los diez primeros. */
  entries: LeaderboardEntry[];
  /** Quien mira, aunque no este entre los diez; `null` si no gano nada esa semana. */
  me: LeaderboardEntry | null;
  updatedAt: string;
}

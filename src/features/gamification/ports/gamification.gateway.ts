import type {
  Leaderboard,
  LeaderboardWeek,
  StudentProfile,
} from '../model/gamification';

/**
 * Lo que la aplicacion necesita del perfil y del top semanal, sin decir de donde sale.
 *
 * Son solo lecturas: nada aqui escribe. El documento lo mantiene engagement al consumir los
 * eventos de las subastas, asi que el front no puede (ni debe) corregirlo.
 */
export interface GamificationGateway {
  /** `GET /profiles/me`. Un estudiante sin actividad recibe un perfil vacio, no un error. */
  myProfile(): Promise<StudentProfile>;
  /** `GET /leaderboard?week=current|previous`. */
  leaderboard(week: LeaderboardWeek): Promise<Leaderboard>;
}

import { useQuery } from '@tanstack/react-query';
import { useContainer } from '@/app/providers/container-provider';
import type { LeaderboardWeek } from '../model/gamification';

export const gamificationKeys = {
  all: ['gamification'] as const,
  profile: () => [...gamificationKeys.all, 'profile'] as const,
  leaderboard: (week: LeaderboardWeek) =>
    [...gamificationKeys.all, 'leaderboard', week] as const,
};

/*
 * Medio minuto de vigencia: el documento cambia cuando cierra una ronda, no a cada segundo,
 * y lo que se lee ya es eventual (unos segundos detras del cierre). Releer mas seguido no lo
 * haria mas fresco, solo mas caro.
 */
const STALE_MS = 30 * 1000;

/** Caso de uso "ver mi perfil": estadisticas, medallas y ultimas subastas. */
export function useMyProfile() {
  const { gamification } = useContainer();
  return useQuery({
    queryKey: gamificationKeys.profile(),
    queryFn: () => gamification.myProfile(),
    staleTime: STALE_MS,
  });
}

/** Caso de uso "ver el top de la semana" (esta o la anterior). */
export function useLeaderboard(week: LeaderboardWeek) {
  const { gamification } = useContainer();
  return useQuery({
    queryKey: gamificationKeys.leaderboard(week),
    queryFn: () => gamification.leaderboard(week),
    staleTime: STALE_MS,
    // Al cambiar de semana se queda lo anterior en pantalla hasta que llega lo nuevo.
    placeholderData: (previous) => previous,
  });
}

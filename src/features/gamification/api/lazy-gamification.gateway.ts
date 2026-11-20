import type { GamificationGateway } from '../ports/gamification.gateway';

/**
 * Un `GamificationGateway` cuyo codigo se descarga la primera vez que se usa, igual que el
 * de subastas: los datos de demostracion solo viajan a quien arranca en modo demo.
 */
export function createLazyGamificationGateway(
  load: () => Promise<GamificationGateway>,
): GamificationGateway {
  let loading: Promise<GamificationGateway> | null = null;
  const gateway = () => (loading ??= load());
  return {
    myProfile: () => gateway().then((g) => g.myProfile()),
    leaderboard: (week) => gateway().then((g) => g.leaderboard(week)),
  };
}

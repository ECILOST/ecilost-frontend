import type { AuctionGateway } from '../ports/auction.gateway';

/**
 * Un `AuctionGateway` cuyo codigo se descarga la primera vez que se usa.
 *
 * Existe por el modo demo: son mas de mil lineas de rivales simulados que en produccion
 * nadie usa, y con un import normal viajaban dentro del paquete inicial de todos. Asi solo
 * los baja quien arranca con `VITE_AUCTIONS_DEMO=true`.
 *
 * `subscribe` es sincrono en el puerto: devuelve ya la forma de cancelar, y si se cancela
 * antes de que llegue el codigo, la suscripcion real no llega a abrirse.
 */
export function createLazyAuctionGateway(
  load: () => Promise<AuctionGateway>,
): AuctionGateway {
  let loading: Promise<AuctionGateway> | null = null;
  const gateway = () => (loading ??= load());

  return {
    items: () => gateway().then((g) => g.items()),
    item: (id) => gateway().then((g) => g.item(id)),
    room: (id) => gateway().then((g) => g.room(id)),
    joinRoom: (id) => gateway().then((g) => g.joinRoom(id)),
    liveRoom: (id) => gateway().then((g) => g.liveRoom(id)),
    placeBid: (roomId, roundId, amount) =>
      gateway().then((g) => g.placeBid(roomId, roundId, amount)),
    buyNow: (roomId, roundId) =>
      gateway().then((g) => g.buyNow(roomId, roundId)),
    setAutoBid: (roomId, roundId, config) =>
      gateway().then((g) => g.setAutoBid(roomId, roundId, config)),
    subscribe(roomId, listener) {
      let cancelled = false;
      let stop: (() => void) | undefined;
      void gateway().then((g) => {
        if (!cancelled) stop = g.subscribe(roomId, listener);
      });
      return () => {
        cancelled = true;
        stop?.();
      };
    },
    roomSummary: (id) => gateway().then((g) => g.roomSummary(id)),
    myBids: () => gateway().then((g) => g.myBids()),
    notifications: () => gateway().then((g) => g.notifications()),
    markNotificationsRead: () =>
      gateway().then((g) => g.markNotificationsRead()),
  };
}

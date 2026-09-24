/** Claves de cache de las subastas, en un solo sitio para invalidar sin adivinar. */
export const auctionKeys = {
  all: ['auctions'] as const,
  items: () => [...auctionKeys.all, 'items'] as const,
  item: (id: string) => [...auctionKeys.all, 'item', id] as const,
  room: (id: string) => [...auctionKeys.all, 'room', id] as const,
  live: (id: string) => [...auctionKeys.all, 'live', id] as const,
  summary: (id: string) => [...auctionKeys.all, 'summary', id] as const,
  myBids: () => [...auctionKeys.all, 'my-bids'] as const,
  notifications: () => [...auctionKeys.all, 'notifications'] as const,
};

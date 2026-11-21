import type { AppNotification } from '../model/auction';

/**
 * Bandeja de notificaciones de quien puja. La sirve ecilost-engagement-service, que la
 * proyecta de los eventos de auction.
 *
 * Va aparte del puerto de subastas a proposito: el modo demo (`VITE_AUCTIONS_DEMO`) solo
 * reemplaza las salas y las pujas. Las notificaciones siempre son las reales; antes salian
 * de la demo y la bandeja mostraba avisos inventados.
 */
export interface NotificationGateway {
  list(): Promise<AppNotification[]>;
  markAllRead(): Promise<void>;
}

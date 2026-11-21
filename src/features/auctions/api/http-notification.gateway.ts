import type { HttpClient } from '@/shared/api/http-client';
import type { AppNotification } from '../model/auction';
import type { NotificationGateway } from '../ports/notification.gateway';

/** Una notificacion tal como la guarda engagement (`GET /notifications`). */
export interface InboxNotification {
  id: string;
  kind: string;
  roomId: string | null;
  payload: { position?: number; currentPrice?: string; roundId?: string };
  createdAt: string;
  readAt: string | null;
}

const coins = (value: string | undefined) =>
  value === undefined ? null : `${Number(value).toLocaleString('es-CO')} ECICoin`;

/**
 * Traduce un aviso de engagement a lo que ve la persona. Solo se escribe lo que el aviso
 * trae: si falta el monto, la frase no lo menciona (antes decia "0 ECICoin"). Un tipo que
 * el front no conoce no se disfraza de otro: se descarta y se registra en la consola.
 */
export function toAppNotification(entry: InboxNotification): AppNotification | null {
  const amount = coins(entry.payload.currentPrice);
  const item = entry.payload.position ? `el objeto ${entry.payload.position}` : 'la ronda';
  const base = {
    id: entry.id,
    at: entry.createdAt,
    read: entry.readAt !== null,
    roomId: entry.roomId,
  };

  switch (entry.kind) {
    case 'PICKUP_READY':
      return {
        ...base,
        kind: 'PICKUP_READY',
        pickupRoundId: entry.payload.roundId,
        title: 'Coordina tu recogida',
        body: 'El pago está confirmado. Abre el asistente para elegir un horario.',
      };
    case 'ROUND_WON':
      return {
        ...base,
        kind: 'WON',
        title: '¡Ganaste este objeto!',
        body: amount ? `Ganaste ${item} por ${amount}.` : `Ganaste ${item}.`,
      };
    case 'OUTBID':
      return {
        ...base,
        kind: 'OUTBID',
        title: 'Te superaron',
        body: amount
          ? `Alguien pujó ${amount} en ${item}. Entra a la sala si quieres responder.`
          : `Alguien superó tu puja en ${item}.`,
      };
    case 'ROUND_CLOSED':
      return {
        ...base,
        kind: 'ROOM_CLOSED',
        title: 'La ronda cerró',
        body: amount ? `Se cerró ${item} en ${amount}.` : `Se cerró ${item}.`,
      };
    default:
      console.warn('[notifications] tipo de aviso desconocido, se omite', entry.kind);
      return null;
  }
}

export function createHttpNotificationGateway(engagement: HttpClient): NotificationGateway {
  return {
    async list() {
      const { items } = await engagement.get<{ items: InboxNotification[] }>('/notifications');
      return items
        .map(toAppNotification)
        .filter((entry): entry is AppNotification => entry !== null);
    },
    async markAllRead() {
      await engagement.post('/notifications/read');
    },
  };
}

import type {
  ChatMessage,
  ChatUnavailableReason,
  RoomChat,
} from '../model/auction';

/** Lo mismo que acepta engagement: un mensaje de una linea de hasta 280 caracteres. */
export const MAX_CHAT_MESSAGE_LENGTH = 280;

/** Cuantos mensajes se guardan en pantalla; los mas viejos se sueltan. */
export const CHAT_WINDOW = 200;

export const CHAT_CONNECTING: RoomChat = {
  status: 'connecting',
  canWrite: false,
  alias: null,
  messages: [],
};

/**
 * Junta mensajes sin repetir ninguno: el historial que llega al reconectar trae los que ya se
 * tenian, y el propio mensaje llega por la sala ademas de en la respuesta del envio.
 */
export function mergeChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()]
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
    .slice(-CHAT_WINDOW);
}

/** Cuantos caracteres cuenta el servicio: un emoji es uno, no dos. */
export function chatLength(text: string): number {
  return [...text.trim()].length;
}

/** Los motivos con que engagement responde `chat.join` que la pantalla distingue. */
export function chatUnavailableReason(reason: string): ChatUnavailableReason {
  return reason === 'not-participant' || reason === 'not-open'
    ? reason
    : 'unavailable';
}

/** Lo que se le dice a quien escribe cuando engagement rechaza su mensaje. */
export function chatSendErrorText(reason: string): string {
  switch (reason) {
    case 'too-fast':
      return 'Vas muy rápido. Espera un momento antes de enviar otro mensaje.';
    case 'too-long':
      return `El mensaje supera los ${MAX_CHAT_MESSAGE_LENGTH} caracteres.`;
    case 'empty':
      return 'Escribe un mensaje antes de enviarlo.';
    case 'closed':
      return 'La subasta terminó: el chat ya no recibe mensajes.';
    case 'read-only':
    case 'not-participant':
      return 'Solo quienes entraron a la sala antes del inicio pueden escribir.';
    case 'unauthorized':
      return 'Tu sesión venció. Vuelve a iniciar sesión para escribir.';
    default:
      return 'No se pudo enviar el mensaje. Inténtalo de nuevo.';
  }
}

/** El envio de un mensaje que engagement rechazo, con el motivo que dio. */
export class ChatSendError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(chatSendErrorText(reason));
    this.name = 'ChatSendError';
    this.reason = reason;
  }
}

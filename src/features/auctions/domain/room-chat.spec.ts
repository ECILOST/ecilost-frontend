import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../model/auction';
import {
  CHAT_WINDOW,
  ChatSendError,
  chatLength,
  chatUnavailableReason,
  mergeChatMessages,
} from './room-chat';

const message = (id: string, second: number): ChatMessage => ({
  id,
  alias: 'Participante AAAA',
  body: id,
  at: new Date(Date.UTC(2030, 0, 1, 10, 0, second)).toISOString(),
  mine: false,
});

describe('mergeChatMessages', () => {
  it('junta sin repetir y en orden de llegada al servidor', () => {
    const merged = mergeChatMessages([message('b', 2), message('a', 1)], [message('c', 3), message('a', 1)]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it(`guarda a lo sumo ${CHAT_WINDOW} mensajes, soltando los mas viejos`, () => {
    const many = Array.from({ length: CHAT_WINDOW + 5 }, (_, index) => message(`m${String(index).padStart(3, '0')}`, index % 60));
    const merged = mergeChatMessages([], many);
    expect(merged).toHaveLength(CHAT_WINDOW);
  });

  it('sin mensajes nuevos devuelve la misma lista', () => {
    const current = [message('a', 1)];
    expect(mergeChatMessages(current, [])).toBe(current);
  });
});

describe('reglas del chat', () => {
  it('cuenta los caracteres como el servicio: un emoji es uno', () => {
    expect(chatLength('  🔥🔥 ')).toBe(2);
  });

  it('solo distingue los motivos que la pantalla explica', () => {
    expect(chatUnavailableReason('not-participant')).toBe('not-participant');
    expect(chatUnavailableReason('not-open')).toBe('not-open');
    expect(chatUnavailableReason('denied')).toBe('unavailable');
  });

  it('el rechazo de un envio dice por que', () => {
    const error = new ChatSendError('too-fast');
    expect(error.reason).toBe('too-fast');
    expect(error.message).toMatch(/muy rápido/);
  });
});

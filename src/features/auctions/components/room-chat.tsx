import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Field, Input } from '@/shared/components/ui/field';
import { APP_TIME_ZONE } from '@/shared/format/date';
import { chatLength, MAX_CHAT_MESSAGE_LENGTH } from '../domain/room-chat';
import { useRoomChat } from '../hooks/use-room-chat';
import type { RoomChat as RoomChatState } from '../model/auction';
import styles from './room-chat.module.css';

const TIME = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: APP_TIME_ZONE,
});

/** Por que el chat no se puede usar, dicho a quien mira. */
function unavailableText(chat: RoomChatState): string {
  if (chat.reason === 'not-participant')
    return 'El chat es solo para quienes entraron a la sala antes del inicio.';
  if (chat.reason === 'not-open')
    return 'El chat se abre cuando empieza la subasta.';
  return 'El chat no está disponible en este momento.';
}

/**
 * Chat de la sala en curso. Escriben los participantes admitidos antes del inicio; el
 * funcionario dueño de la sala lo lee (`readOnly`), y con la sala cerrada queda el historial.
 * Quien escribe aparece con un alias de la sala, nunca con su nombre.
 */
export function RoomChat({
  roomId,
  readOnly = false,
}: {
  roomId: string;
  readOnly?: boolean;
}) {
  const { chat, send } = useRoomChat(roomId);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const listRef = useRef<HTMLOListElement>(null);

  const canWrite = chat.canWrite && !readOnly;
  const length = chatLength(text);
  const lastId = chat.messages.at(-1)?.id;

  // Cada mensaje nuevo baja la lista hasta el final, salvo que quien mira haya subido a leer.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (nearBottom || chat.messages.at(-1)?.mine)
      list.scrollTop = list.scrollHeight;
  }, [lastId, chat.messages]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!canWrite || send.isPending) return;
    if (length === 0) {
      setError('Escribe un mensaje antes de enviarlo.');
      return;
    }
    if (length > MAX_CHAT_MESSAGE_LENGTH) {
      setError(`El mensaje supera los ${MAX_CHAT_MESSAGE_LENGTH} caracteres.`);
      return;
    }
    setError(undefined);
    send.mutate(text, {
      onSuccess: () => setText(''),
      onError: (failure) => setError(failure.message),
    });
  }

  return (
    <section className={styles.chat} aria-labelledby="chat-de-la-sala">
      <header className={styles.head}>
        <h2 id="chat-de-la-sala" className={styles.heading}>
          Chat de la sala
        </h2>
        {chat.alias ? (
          <span className={styles.me}>Escribes como {chat.alias}</span>
        ) : null}
      </header>

      {chat.status === 'unavailable' ? (
        <p className={styles.notice}>{unavailableText(chat)}</p>
      ) : (
        <>
          {chat.status === 'connecting' ? (
            <p className={styles.notice}>Conectando con el chat...</p>
          ) : chat.messages.length === 0 ? (
            <p className={styles.notice}>
              Todavía no hay mensajes. ¡Saluda a la sala!
            </p>
          ) : null}
          {chat.messages.length > 0 ? (
            <ol
              ref={listRef}
              className={styles.list}
              role="log"
              aria-live="polite"
            >
              {chat.messages.map((message) => (
                <li
                  key={message.id}
                  className={[styles.message, message.mine ? styles.mine : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.meta}>
                    <span className={styles.alias}>
                      {message.mine ? 'Tú' : message.alias}
                    </span>
                    <time dateTime={message.at}>
                      {TIME.format(new Date(message.at))}
                    </time>
                  </span>
                  <span className={styles.body}>{message.body}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}

      {canWrite ? (
        <form className={styles.form} onSubmit={submit} noValidate>
          <Field
            label="Mensaje"
            hint={`${length}/${MAX_CHAT_MESSAGE_LENGTH}`}
            error={error}
          >
            <Input
              autoComplete="off"
              placeholder="Escribe a la sala..."
              value={text}
              maxLength={MAX_CHAT_MESSAGE_LENGTH * 2}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            disabled={send.isPending || length === 0}
          >
            Enviar
          </Button>
        </form>
      ) : chat.status === 'ready' ? (
        <p className={styles.readOnly}>
          {readOnly
            ? 'Estás viendo el chat: como organizador no puedes escribir.'
            : 'La subasta terminó: el chat queda en solo lectura.'}
        </p>
      ) : null}
    </section>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContainer } from '@/app/providers/container-provider';
import { routes } from '@/app/routes';
import { useSession } from '@/features/auth/hooks/use-session';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button, buttonClass } from '@/shared/components/ui/button';
import type { Conversation, Pickup, Slot } from './pickup.gateway';
import styles from './pickups.page.module.css';

const statusLabels: Record<Pickup['status'], string> = {
  PENDING: 'Por agendar',
  BOOKED: 'Agendada',
  NEEDS_HELP: 'En atención',
  DELIVERED: 'Entregada',
};
const authorLabels = { BOT: 'Asistente ECILOST', WINNER: 'Ganador', STAFF: 'Personal' };
const dateFormat = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota',
});

function formatSlot(slot: Pickup['slot']) {
  if (!slot) return '';
  return `${slot.location} · ${dateFormat.formatRange(new Date(slot.startsAt), new Date(slot.endsAt))}`;
}

function usePickupQueries(staff: boolean) {
  const { pickups } = useContainer();
  const { principal } = useSession();
  const client = useQueryClient();
  const prefix = ['pickups', principal?.userId, staff] as const;
  return {
    pickups,
    prefix,
    refresh: () => client.invalidateQueries({ queryKey: prefix }),
  };
}

function PickupList({ staff }: { staff: boolean }) {
  const { pickups, prefix } = usePickupQueries(staff);
  const list = useQuery({
    queryKey: [...prefix, 'list'],
    queryFn: () => pickups.list(staff),
    refetchInterval: 15_000,
  });

  if (list.isPending) return <Loading label="Cargando recogidas…" />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  if (!list.data.length) return <EmptyState title="Todavía no hay recogidas" />;

  const detail = staff ? routes.staffPickup : routes.pickup;
  return (
    <ul className={styles.list}>
      {list.data.map((pickup) => (
        <li key={pickup.roundId}>
          <Link className={styles.row} to={detail(pickup.roundId)}>
            <span>
              <strong>{pickup.title ?? 'Adjudicación'}</strong>
              <small>{formatSlot(pickup.slot) || dateFormat.format(new Date(pickup.createdAt))}</small>
            </span>
            <span className={styles.badge}>{statusLabels[pickup.status]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StaffSlots() {
  const { pickups, prefix, refresh } = usePickupQueries(true);
  const slots = useQuery({ queryKey: [...prefix, 'slots'], queryFn: () => pickups.slots(true) });
  const form = useMutation({ mutationFn: pickups.createSlot, onSuccess: refresh });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);
    try {
      await form.mutateAsync({
        location: String(data.get('location')),
        startsAt: new Date(`${data.get('startsAt')}-05:00`).toISOString(),
        endsAt: new Date(`${data.get('endsAt')}-05:00`).toISOString(),
        capacity: Number(data.get('capacity')),
      });
      element.reset();
    } catch {
      // La mutación conserva el error para mostrarlo junto al formulario.
    }
  }

  return (
    <section className={styles.panel}>
      <h2>Horarios de recogida</h2>
      <p>Las horas se registran en horario de Colombia.</p>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <label>Lugar<input name="location" maxLength={160} required /></label>
        <label>Inicio<input type="datetime-local" name="startsAt" required /></label>
        <label>Fin<input type="datetime-local" name="endsAt" required /></label>
        <label>Cupos<input type="number" name="capacity" min={1} max={500} defaultValue={1} required /></label>
        <Button type="submit" disabled={form.isPending}>Agregar horario</Button>
      </form>
      {form.isError && <ErrorState error={form.error} />}
      {form.isSuccess && <p role="status">Horario guardado.</p>}
      {slots.isPending && <Loading label="Cargando horarios…" />}
      {slots.isError && <ErrorState error={slots.error} onRetry={() => void slots.refetch()} />}
      {slots.data?.length === 0 && <p>Aún no hay horarios futuros.</p>}
      <ul className={styles.list}>
        {slots.data?.map((slot) => <li className={styles.slot} key={slot.id}>
          {formatSlot(slot)} <small>{slot.available} de {slot.capacity} cupos libres</small>
        </li>)}
      </ul>
    </section>
  );
}

function ConversationView({ staff, roundId }: { staff: boolean; roundId: string }) {
  const { pickups, prefix, refresh } = usePickupQueries(staff);
  const chat = useQuery({
    queryKey: [...prefix, 'conversation', roundId],
    queryFn: () => pickups.conversation(staff, roundId),
    refetchInterval: 10_000,
  });
  const slots = useQuery({
    queryKey: [...prefix, 'slots'],
    queryFn: () => pickups.slots(false),
    enabled: !staff && (chat.data?.status === 'PENDING' || chat.data?.status === 'BOOKED'),
    refetchInterval: 15_000,
  });

  if (chat.isPending) return <Loading label="Cargando conversación…" />;
  if (chat.isError) return <ErrorState error={chat.error} onRetry={() => void chat.refetch()} />;
  const conversation = chat.data;
  return (
    <section className={styles.panel}>
      <div className={styles.meta}>
        <h2>{conversation.title ?? 'Adjudicación'}</h2>
        <span className={styles.badge}>{statusLabels[conversation.status]}</span>
      </div>
      {staff && <p>Referencia de ronda <code>{conversation.roundId}</code></p>}
      {conversation.slot && <p>{formatSlot(conversation.slot)} (hora de Colombia)</p>}
      <ol className={styles.chat} aria-live="polite" aria-label="Conversación de recogida">
        {conversation.messages.map((message) => (
          <li key={message.id} className={!staff && message.author === 'WINNER' ? styles.own : undefined}>
            <strong>{!staff && message.author === 'WINNER' ? 'Tú' : authorLabels[message.author]}</strong>
            <p>{message.body}</p>
            <small>{dateFormat.format(new Date(message.createdAt))}</small>
          </li>
        ))}
      </ol>
      {conversation.status !== 'DELIVERED' && (
        <ConversationActions conversation={conversation} staff={staff} slots={slots.data} refresh={refresh}>
          {slots.isFetching && !slots.data && <Loading label="Cargando horarios…" />}
          {slots.isError && <ErrorState error={slots.error} onRetry={() => void slots.refetch()} />}
        </ConversationActions>
      )}
    </section>
  );
}

function ConversationActions({ conversation, staff, slots, refresh, children }: {
  conversation: Conversation;
  staff: boolean;
  slots?: Slot[];
  refresh: () => Promise<void>;
  children: ReactNode;
}) {
  const { pickups } = useContainer();
  const [deliveryCode, setDeliveryCode] = useState<{ code: string; slotId: string }>();
  const { roundId, status } = conversation;
  const action = useMutation({
    mutationFn: async (input: { type: 'book' | 'code' | 'message' | 'deliver' | 'missed'; value?: string }) => {
      switch (input.type) {
        case 'book':
          await pickups.book(roundId, input.value ?? '');
          setDeliveryCode(undefined);
          break;
        case 'code': {
          const result = await pickups.code(roundId);
          if (conversation.slot) setDeliveryCode({ code: result.code, slotId: conversation.slot.id });
          break;
        }
        case 'message':
          await pickups.message(staff, roundId, input.value ?? '');
          setDeliveryCode(undefined);
          break;
        case 'missed':
          await pickups.missed(roundId);
          break;
        case 'deliver':
          await pickups.deliver(roundId, input.value ?? '');
          break;
      }
    },
    onSettled: refresh,
  });
  const busy = action.isPending;
  const ended = conversation.slot && Date.parse(conversation.slot.endsAt) <= Date.now();

  async function submit(event: FormEvent<HTMLFormElement>, type: 'message' | 'deliver') {
    event.preventDefault();
    const form = event.currentTarget;
    const value = new FormData(form).get('value');
    if (typeof value !== 'string' || !value.trim()) return;
    try {
      await action.mutateAsync({ type, value: value.trim() });
      form.reset();
    } catch {
      // Se muestra el error sin descartar lo que se escribió.
    }
  }

  return (
    <div className={styles.actions}>
      {!staff && status !== 'NEEDS_HELP' && (
        <div>
          <h3>{status === 'BOOKED' ? 'Reprogramar recogida' : 'Elegir horario'}</h3>
          {children}
          {slots?.length === 0 && <p>No hay cupos por ahora. Puedes pedir ayuda al personal.</p>}
          <ul className={styles.list}>
            {slots?.filter((slot) => slot.id !== conversation.slot?.id).map((slot) => (
              <li key={slot.id}>
                <Button variant="secondary" disabled={busy} onClick={() => action.mutate({ type: 'book', value: slot.id })}>
                  {formatSlot(slot)}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!staff && status === 'BOOKED' && !ended && (
        <div>
          <Button disabled={busy} onClick={() => action.mutate({ type: 'code' })}>Generar código de entrega</Button>
          {deliveryCode && deliveryCode.slotId === conversation.slot?.id && (
            <p role="status">Muestra al personal este código de un solo uso <code className={styles.code}>{deliveryCode.code}</code></p>
          )}
        </div>
      )}
      {(!staff || status === 'NEEDS_HELP') && (
        <form className={styles.form} onSubmit={(event) => void submit(event, 'message')}>
          <label>
            {staff ? 'Responder al ganador' : 'Pedir ayuda al personal'}
            <textarea name="value" maxLength={500} required rows={2} />
          </label>
          <Button type="submit" variant="secondary" disabled={busy}>Enviar mensaje</Button>
        </form>
      )}
      {staff && status === 'BOOKED' && ended && (
        <Button variant="secondary" disabled={busy} onClick={() => action.mutate({ type: 'missed' })}>Registrar inasistencia</Button>
      )}
      {staff && status === 'BOOKED' && !ended && (
        <form className={styles.form} onSubmit={(event) => void submit(event, 'deliver')}>
          <label>Código del ganador<input name="value" minLength={16} maxLength={16} required autoComplete="off" /></label>
          <Button type="submit" disabled={busy}>Confirmar entrega</Button>
        </form>
      )}
      {action.isError && <ErrorState error={action.error} />}
    </div>
  );
}

export default function PickupsPage({ staff = false }: { staff?: boolean }) {
  const { roundId } = useParams<{ roundId: string }>();
  const list = staff ? routes.staffPickups : routes.pickups;
  return (
    <main className={styles.page}>
      <header>
        {roundId && <Link className={buttonClass('secondary')} to={list}>Volver a recogidas</Link>}
        <h1>{staff ? 'Gestión de recogidas' : 'Mis recogidas'}</h1>
      </header>
      {roundId ? <ConversationView key={roundId} staff={staff} roundId={roundId} /> : (
        <>
          <section className={styles.panel} aria-label="Listado de recogidas">
            <PickupList staff={staff} />
          </section>
          {staff && <StaffSlots />}
        </>
      )}
    </main>
  );
}

import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/app/routes';
import { formatEcicoin } from '@/features/wallet/domain/ecicoin';
import { ApiError } from '@/shared/api/problem-details';
import { ErrorState } from '@/shared/components/error-state';
import { flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { Button } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Field, FormActions, Input, Select } from '@/shared/components/ui/field';
import { Icon } from '@/shared/components/ui/icon';
import { Notice } from '@/shared/components/ui/notice';
import { Page, PageHeader } from '@/shared/components/ui/page';
import {
  hasErrors,
  toScheduleRequest,
  validateDraft,
  type RoundDraft,
  type ScheduleDraft,
  type ScheduleErrors,
} from '../domain/schedule-draft';
import { AuctionableKind } from '../domain/room-status';
import { ROOM_NAME_MAX } from '../model/room';
import { useAuctionables, type Auctionable } from '../hooks/use-auctionables';
import { useScheduleRoom } from '../hooks/use-schedule-room';
import styles from './schedule-room.page.module.css';

const NO_ERRORS: ScheduleErrors = { rounds: {} };

/**
 * Programar una sala (HU-15): nombre, hora de inicio, aforo y las rondas encadenadas, cada
 * una con un objeto o un lote y su precio minimo.
 *
 * Una entrada por ronda, aunque el servicio acepte varias: la sala cambia de objeto en cada
 * ronda, como la describe el deck, y asi el precio minimo es de algo concreto.
 *
 * La confirmacion no es ceremonia. Programar reserva en catalog cada objeto y lote, que
 * pasan a "En subasta", y el servicio no publica forma de cancelar ni de editar la sala.
 */
export function ScheduleRoomPage() {
  const navigate = useNavigate();
  const schedule = useScheduleRoom();
  const auctionables = useAuctionables();
  const nextId = useRef(2);

  const [draft, setDraft] = useState<ScheduleDraft>({
    name: '',
    startsAt: '',
    capacity: '',
    rounds: [{ id: 'round-1', entry: '', startingPrice: '' }],
  });
  const [errors, setErrors] = useState<ScheduleErrors>(NO_ERRORS);
  const [confirming, setConfirming] = useState(false);

  const byKey = new Map(auctionables.options.map((option) => [option.key, option]));

  function update(patch: Partial<ScheduleDraft>): void {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateRound(id: string, patch: Partial<RoundDraft>): void {
    setDraft((current) => ({
      ...current,
      rounds: current.rounds.map((round) =>
        round.id === id ? { ...round, ...patch } : round,
      ),
    }));
  }

  function addRound(): void {
    const id = `round-${nextId.current++}`;
    update({ rounds: [...draft.rounds, { id, entry: '', startingPrice: '' }] });
  }

  function removeRound(id: string): void {
    update({ rounds: draft.rounds.filter((round) => round.id !== id) });
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const found = validateDraft(draft);
    setErrors(found);
    if (!hasErrors(found)) setConfirming(true);
  }

  function confirm(): void {
    schedule.mutate(toScheduleRequest(draft), {
      onSuccess: (room) =>
        navigate(routes.managedRoom(room.id), {
          replace: true,
          state: flash(
            `«${room.name}» quedó programada con ${room.rounds.length} ${room.rounds.length === 1 ? 'ronda' : 'rondas'}.`,
          ),
        }),
      onSettled: () => setConfirming(false),
    });
  }

  if (auctionables.isPending) {
    return (
      <Page>
        <Loading label="Buscando objetos y lotes disponibles..." />
      </Page>
    );
  }

  if (auctionables.error) {
    return (
      <Page>
        <PageHeader
          title="Programar sala"
          back={{ to: routes.managedRooms, label: 'Salas' }}
        />
        <ErrorState
          error={auctionables.error}
          onRetry={auctionables.refetch}
        />
      </Page>
    );
  }

  const chosen = new Set(draft.rounds.map((round) => round.entry));
  const noOptions = auctionables.options.length === 0;

  return (
    <Page>
      <PageHeader
        eyebrow="Salas"
        title="Programar sala"
        back={{ to: routes.managedRooms, label: 'Salas' }}
      />

      {schedule.isError ? (
        <div className={styles.summary}>
          <ScheduleFailure error={schedule.error} />
        </div>
      ) : null}

      {noOptions ? (
        <Notice tone="alert" title="No hay nada disponible para subastar">
          Cada ronda lleva un objeto disponible o un lote activo, y ahora mismo
          no hay ninguno. Registra un objeto o arma un lote primero.
        </Notice>
      ) : null}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field
          label="Nombre de la sala"
          hint="Con el que la reconocen los estudiantes."
          error={errors.name}
          required
        >
          <Input
            value={draft.name}
            maxLength={ROOM_NAME_MAX}
            autoComplete="off"
            placeholder="Subasta de electrónica · octubre"
            onChange={(event) => update({ name: event.target.value })}
          />
        </Field>

        <div className={styles.row}>
          <Field
            label="Inicio"
            hint="A esta hora se abre sola y se cierra el registro."
            error={errors.startsAt}
            required
          >
            <Input
              type="datetime-local"
              value={draft.startsAt}
              onChange={(event) => update({ startsAt: event.target.value })}
            />
          </Field>

          <Field
            label="Aforo máximo"
            hint="Cuántos estudiantes pueden registrarse."
            error={errors.capacity}
            required
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              placeholder="30"
              value={draft.capacity}
              onChange={(event) => update({ capacity: event.target.value })}
            />
          </Field>
        </div>

        <fieldset className={styles.rounds}>
          <legend className={styles.legend}>
            Rondas
            <span className={styles.count}>
              {draft.rounds.length}{' '}
              {draft.rounds.length === 1 ? 'ronda' : 'rondas'}, en este orden
            </span>
          </legend>

          <ol className={styles.roundList}>
            {draft.rounds.map((round, index) => (
              <li key={round.id} className={styles.round}>
                <span className={styles.position} aria-hidden="true">
                  {index + 1}
                </span>
                <div className={styles.roundFields}>
                  <Field
                    label={`Objeto o lote de la ronda ${index + 1}`}
                    error={errors.rounds[round.id]?.entry}
                    required
                  >
                    <Select
                      value={round.entry}
                      disabled={schedule.isPending}
                      onChange={(event) =>
                        updateRound(round.id, { entry: event.target.value })
                      }
                    >
                      <option value="">Elige qué se subasta</option>
                      <EntryOptions
                        label="Objetos disponibles"
                        options={auctionables.options.filter(
                          (option) => option.kind === AuctionableKind.ITEM,
                        )}
                        chosen={chosen}
                        current={round.entry}
                      />
                      <EntryOptions
                        label="Lotes activos"
                        options={auctionables.options.filter(
                          (option) => option.kind === AuctionableKind.LOT,
                        )}
                        chosen={chosen}
                        current={round.entry}
                      />
                    </Select>
                  </Field>

                  <Field
                    label="Precio mínimo"
                    hint="En ECICoin, sin centavos. La primera puja debe alcanzarlo; después, cada puja suma al menos 100."
                    error={errors.rounds[round.id]?.startingPrice}
                    required
                  >
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="50000"
                      value={round.startingPrice}
                      disabled={schedule.isPending}
                      onChange={(event) =>
                        updateRound(round.id, {
                          startingPrice: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                {draft.rounds.length > 1 ? (
                  <Button
                    variant="quiet"
                    disabled={schedule.isPending}
                    aria-label={`Quitar la ronda ${index + 1}`}
                    onClick={() => removeRound(round.id)}
                  >
                    <Icon name="trash" size={18} />
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>

          <div className={styles.roundActions}>
            <Button
              variant="secondary"
              disabled={schedule.isPending || noOptions}
              onClick={addRound}
            >
              <Icon name="plus" size={18} />
              Añadir ronda
            </Button>
            {auctionables.hasMoreItems ? (
              <Button
                variant="quiet"
                disabled={auctionables.isLoadingMore}
                onClick={auctionables.loadMoreItems}
              >
                {auctionables.isLoadingMore
                  ? 'Cargando...'
                  : 'Cargar más objetos disponibles'}
              </Button>
            ) : null}
          </div>
        </fieldset>

        <Notice tone="alert" title="Esto no se puede deshacer">
          Al programar la sala, sus objetos y lotes quedan reservados en el
          catálogo como «En subasta». No hay forma de editar ni de cancelar la
          sala desde aquí.
        </Notice>

        <FormActions>
          <Button type="submit" disabled={schedule.isPending || noOptions}>
            {schedule.isPending ? 'Programando...' : 'Programar sala'}
          </Button>
          <Button
            variant="quiet"
            disabled={schedule.isPending}
            onClick={() => navigate(routes.managedRooms)}
          >
            Cancelar
          </Button>
        </FormActions>
      </form>

      <ConfirmDialog
        open={confirming}
        title={`¿Programar «${draft.name.trim()}»?`}
        confirmLabel="Programar la sala"
        tone="primary"
        busy={schedule.isPending}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      >
        Quedarán reservados en el catálogo:{' '}
        <strong>
          {draft.rounds
            .map(
              (round, index) =>
                `${index + 1}. ${byKey.get(round.entry)?.name ?? '—'} (desde ${formatEcicoin(round.startingPrice.trim())})`,
            )
            .join(' · ')}
        </strong>
        .
      </ConfirmDialog>
    </Page>
  );
}

/**
 * Un grupo de opciones del selector. Lo elegido en otra ronda se muestra apagado en vez de
 * desaparecer: asi el funcionario entiende por que no puede repetirlo.
 */
function EntryOptions({
  label,
  options,
  chosen,
  current,
}: {
  label: string;
  options: Auctionable[];
  chosen: Set<string>;
  current: string;
}) {
  if (options.length === 0) return null;

  return (
    <optgroup label={label}>
      {options.map((option) => (
        <option
          key={option.key}
          value={option.key}
          disabled={chosen.has(option.key) && option.key !== current}
        >
          {option.name} · {option.detail}
        </option>
      ))}
    </optgroup>
  );
}

/** Por que no se programo, con la salida concreta de cada caso. */
function ScheduleFailure({ error }: { error: Error }) {
  const status = error instanceof ApiError ? error.status : 0;

  if (status === 409) {
    return (
      <Notice
        tone="alert"
        live="alert"
        title="Alguno de los objetos o lotes dejó de estar disponible"
      >
        Otro funcionario lo reservó o cambió su estado. La sala no se programó y
        las listas ya están actualizadas: revisa las rondas y vuelve a
        intentarlo.
      </Notice>
    );
  }

  if (status === 503) {
    return (
      <Notice tone="alert" live="alert" title="El catálogo no respondió">
        No se pudo confirmar la reserva de los objetos, así que la sala no se
        programó. Vuelve a intentarlo en unos segundos.
      </Notice>
    );
  }

  const problem = error instanceof ApiError ? error.problem : undefined;

  return (
    <Notice tone="alert" live="alert" title="No se pudo programar la sala">
      {problem?.errors?.join(' ') ??
        problem?.detail ??
        'Vuelve a intentarlo en unos segundos.'}
    </Notice>
  );
}

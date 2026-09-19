import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import { flash } from '@/shared/components/flash';
import { Button } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Field, FormActions, Input } from '@/shared/components/ui/field';
import { Notice } from '@/shared/components/ui/notice';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { ItemPicker } from '../components/item-picker';
import { useCreateLot } from '../hooks/use-create-lot';
import { LOT_NAME_MAX, MIN_LOT_ITEMS, type LotItem } from '../model/lot';
import styles from './lot-form.page.module.css';

/**
 * Creacion de un lote (HU-05).
 *
 * Los objetos se eligen aqui y no despues porque no hay un despues: el servicio no publica
 * forma de añadir ni de quitar objetos de un lote ya creado.
 *
 * Por eso la confirmacion no es ceremonia. Un objeto dentro de un lote queda atrapado:
 * `IN_LOT` no tiene ninguna transicion manual de vuelta, el borrado del objeto esta
 * bloqueado, y la operacion que los liberaria (`releaseItems`) existe en el servicio pero no
 * tiene endpoint, a la espera de la sala de subastas. Hoy, un lote creado por error solo se
 * deshace tocando la base a mano.
 */
export function LotFormPage() {
  const navigate = useNavigate();
  const create = useCreateLot();

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<LotItem[]>([]);
  const [nameError, setNameError] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  const enough = selected.length >= MIN_LOT_ITEMS;
  const taken =
    create.error instanceof ApiError &&
    create.error.is(ProblemType.LOT_EXCLUSIVITY);

  function toggle(item: LotItem): void {
    setSelected((current) =>
      current.some((chosen) => chosen.id === item.id)
        ? current.filter((chosen) => chosen.id !== item.id)
        : [...current, item],
    );
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!name.trim()) {
      setNameError('Ponle un nombre al lote.');
      return;
    }

    setNameError(undefined);
    setConfirming(true);
  }

  function confirm(): void {
    create.mutate(
      { name: name.trim(), itemIds: selected.map((item) => item.id) },
      {
        onSuccess: (lot) =>
          navigate(routes.lot(lot.id), {
            replace: true,
            state: flash(
              `«${lot.name}» quedó armado con ${lot.items.length} objetos.`,
            ),
          }),
        onSettled: () => setConfirming(false),
      },
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Lotes"
        title="Crear lote"
        back={{ to: routes.lots, label: 'Lotes' }}
      />

      {create.isError ? (
        <div className={styles.summary}>
          <Notice
            tone="alert"
            live="alert"
            title={
              taken
                ? 'Alguno de los objetos dejó de estar disponible'
                : 'No se pudo crear el lote'
            }
            actions={
              taken ? (
                <Button variant="secondary" onClick={() => setSelected([])}>
                  Empezar la selección de nuevo
                </Button>
              ) : null
            }
          >
            {taken
              ? 'Otra persona se adelantó y lo puso en otro lote, o cambió su estado. El lote no se creó: la lista de abajo ya está actualizada, vuelve a elegir.'
              : ((create.error as ApiError).problem?.detail ??
                'Vuelve a intentarlo en unos segundos.')}
          </Notice>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field
          label="Nombre del lote"
          hint="Con el que se reconoce en la sala de subastas."
          error={nameError}
          required
        >
          <Input
            value={name}
            maxLength={LOT_NAME_MAX}
            autoComplete="off"
            placeholder="Kit de electrónica extraviada"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <ItemPicker
          selected={selected}
          onToggle={toggle}
          disabled={create.isPending}
        />

        <Notice tone="alert" title="Esto no se puede deshacer">
          Los objetos que elijas quedan reservados en el lote. No hay forma de
          sacarlos ni de borrar el lote: los liberará la sala de subastas cuando
          la ronda termine o se cancele.
        </Notice>

        <FormActions>
          <Button type="submit" disabled={!enough || create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear lote'}
          </Button>
          <Button
            variant="quiet"
            disabled={create.isPending}
            onClick={() => navigate(routes.lots)}
          >
            Cancelar
          </Button>
          {/*
            Por que el boton esta apagado, escrito al lado y no escondido en un mensaje que
            aparece al pulsarlo: un boton deshabilitado sin explicacion se lee como una
            aplicacion rota.
          */}
          {enough ? null : (
            <span className={styles.requirement} aria-live="polite">
              Elige al menos {MIN_LOT_ITEMS} objetos.
            </span>
          )}
        </FormActions>
      </form>

      <ConfirmDialog
        open={confirming}
        title={`¿Armar el lote con ${selected.length} objetos?`}
        confirmLabel="Crear el lote"
        tone="primary"
        busy={create.isPending}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      >
        Quedarán reservados y no se podrán editar, retirar ni borrar mientras
        pertenezcan al lote:{' '}
        <strong>{selected.map((item) => item.name).join(', ')}</strong>.
      </ConfirmDialog>
    </Page>
  );
}

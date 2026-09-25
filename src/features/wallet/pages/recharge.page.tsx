import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useUserLookup } from '@/features/auth/hooks/use-user-lookup';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import { ErrorState } from '@/shared/components/error-state';
import { Button } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Field, FormActions, Input } from '@/shared/components/ui/field';
import { Notice } from '@/shared/components/ui/notice';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { Pill } from '@/shared/components/ui/pill';
import { formatEcicoin, isValidAmount } from '../domain/ecicoin';
import { useRecharge } from '../hooks/use-recharge';
import styles from './recharge.page.module.css';

/**
 * Abonar ECICoin a la billetera de alguien (operacion de funcionario).
 *
 * Son dos pasos y no uno: primero se busca a la persona por su correo, y solo despues
 * aparece la cantidad. El orden no es estetico. El resto de la plataforma identifica a las
 * personas por `userId`, que nadie conoce de memoria, asi que sin la busqueda previa este
 * formulario pediria un identificador imposible de escribir. Y ademas obliga a mirar a quien
 * se le esta abonando antes de decidir cuanto.
 */
export function RechargePage() {
  const navigate = useNavigate();
  const recharge = useRecharge();

  const [email, setEmail] = useState('');
  /** El correo que ya se busco. Cadena vacia = todavia no se ha buscado. */
  const [searched, setSearched] = useState('');
  const lookup = useUserLookup(searched);
  const person = lookup.data;

  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [amountError, setAmountError] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  const done = recharge.data;
  const unknownEmail =
    lookup.error instanceof ApiError && lookup.error.status === 404;
  const noWallet =
    recharge.error instanceof ApiError &&
    recharge.error.is(ProblemType.WALLET_NOT_FOUND);

  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    recharge.reset();
    setSearched(email.trim().toLowerCase());
  }

  function startOver(): void {
    setSearched('');
    setAmount('');
    setReference('');
    setAmountError(undefined);
    recharge.reset();
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isValidAmount(amount)) {
      setAmountError(
        'Escribe una cantidad entera mayor que cero: un ECICoin vale un peso, sin centavos.',
      );
      return;
    }

    setAmountError(undefined);
    setConfirming(true);
  }

  function confirm(): void {
    if (!person) return;

    recharge.mutate(
      {
        userId: person.userId,
        request: {
          amount: Number(amount.trim()),
          // Vacia es como no mandarla: el servicio la guarda como unica, y una cadena vacia
          // chocaria con la de cualquier otra recarga sin referencia.
          ...(reference.trim() ? { reference: reference.trim() } : {}),
        },
      },
      { onSettled: () => setConfirming(false) },
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Billetera"
        title="Recargar ECICoin"
        back={{ to: routes.items, label: 'Catálogo' }}
      />

      {done ? (
        <Notice
          tone={done.replayed ? 'neutral' : 'success'}
          live="status"
          title={
            done.replayed
              ? 'Esa recarga ya se había hecho: no se abonó nada'
              : 'Recarga abonada'
          }
        >
          {done.replayed
            ? 'Ya existía una recarga con esa misma referencia, así que el servicio devolvió la de entonces en lugar de sumar dos veces.'
            : `Se abonaron ${formatEcicoin(done.transaction.amount)} ECICoin.`}{' '}
          El saldo disponible quedó en{' '}
          <strong className="u-numeric">
            {formatEcicoin(done.wallet.availableBalance)}
          </strong>{' '}
          ECICoin.
        </Notice>
      ) : null}

      {/*
        Los dos 404 que puede haber aqui son distintos y tienen salidas distintas: uno es que
        la persona no tiene cuenta, el otro que la tiene pero nunca entro. Mezclarlos en un
        "no encontrado" dejaria a quien recarga sin saber a quien preguntarle.
      */}
      {unknownEmail ? (
        <Notice
          tone="alert"
          live="alert"
          title="No hay ninguna cuenta con ese correo"
        >
          Comprueba que esté bien escrito. La cuenta se crea la primera vez que
          la persona entra a ECILOST con su correo institucional.
        </Notice>
      ) : null}

      {noWallet ? (
        <Notice
          tone="alert"
          live="alert"
          title="Esa persona todavía no tiene billetera"
        >
          Tiene cuenta, pero su billetera se emite la primera vez que entra a la
          aplicación. Pídele que inicie sesión una vez y vuelve a intentarlo.
        </Notice>
      ) : null}

      {lookup.isError && !unknownEmail ? (
        <ErrorState error={lookup.error} />
      ) : null}
      {recharge.isError && !noWallet ? (
        <ErrorState error={recharge.error} />
      ) : null}

      {person ? (
        <div className={styles.person}>
          <div className={styles.identity}>
            <span className={styles.name}>{person.fullName}</span>
            <span className={styles.email}>{person.email}</span>
          </div>
          {person.status === 'SUSPENDED' ? (
            <Pill tone="yellow" dot>
              Cuenta inactiva
            </Pill>
          ) : null}
          <Button variant="quiet" onClick={startOver}>
            Cambiar
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={search} noValidate>
          <Field
            label="Correo de la persona"
            hint="El correo institucional con el que entra a ECILOST."
            required
          >
            <Input
              value={email}
              type="email"
              autoComplete="off"
              spellCheck={false}
              placeholder="estudiante@escuelaing.edu.co"
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <FormActions>
            <Button type="submit" disabled={lookup.isFetching || !email.trim()}>
              {lookup.isFetching ? 'Buscando...' : 'Buscar'}
            </Button>
          </FormActions>
        </form>
      )}

      {person?.status === 'SUSPENDED' ? (
        <Notice tone="alert" title="Esta cuenta está inactiva">
          Puedes abonarle saldo, pero no va a poder entrar a usarlo mientras siga
          así.
        </Notice>
      ) : null}

      {person ? (
        <form className={styles.form} onSubmit={submit} noValidate>
          <Field
            label="Cantidad"
            hint="En ECICoin, sin centavos: un ECICoin vale un peso colombiano."
            error={amountError}
            required
          >
            <Input
              value={amount}
              // `numeric` y no `number`: el teclado del movil sale solo con digitos y el
              // control no arrastra las flechas de incremento, que aqui no pintan nada.
              inputMode="numeric"
              autoComplete="off"
              placeholder="50000"
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>

          <Field
            label="Referencia"
            hint="Opcional, pero recomendada: identifica la operación que originó la recarga. Si la envías dos veces con la misma referencia, el servicio no abona dos veces."
          >
            <Input
              value={reference}
              autoComplete="off"
              placeholder="consignacion-2026-09-19-001"
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>

          <p className={styles.note}>
            Una recarga no se puede deshacer desde aquí: el servicio no publica
            ninguna operación de retiro.
          </p>

          <FormActions>
            <Button type="submit" disabled={recharge.isPending}>
              {recharge.isPending ? 'Abonando...' : 'Abonar'}
            </Button>
            <Button
              variant="quiet"
              disabled={recharge.isPending}
              onClick={() => navigate(routes.items)}
            >
              Cancelar
            </Button>
          </FormActions>
        </form>
      ) : null}

      {/*
        La confirmacion existe para cazar un cero de mas. La persona ya esta comprobada, pero
        la cantidad se escribe a mano y lo que sale de aqui no tiene vuelta atras.
      */}
      <ConfirmDialog
        open={confirming}
        title="¿Abonar esta cantidad?"
        confirmLabel="Abonar"
        tone="primary"
        busy={recharge.isPending}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
      >
        Se abonarán{' '}
        <strong className="u-numeric">{formatEcicoin(amount.trim())}</strong>{' '}
        ECICoin a la billetera de <strong>{person?.fullName}</strong>.
      </ConfirmDialog>
    </Page>
  );
}

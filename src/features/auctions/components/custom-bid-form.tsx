import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import { Field, Input } from '@/shared/components/ui/field';
import styles from './custom-bid-form.module.css';

/**
 * Pujar una cantidad exacta, ademas del boton con la minima.
 *
 * Se valida aqui lo mismo que en el servicio (entero y al menos la minima) para no gastar
 * una reserva de ECICoin en una puja que se va a rechazar. El servicio vuelve a comprobarlo
 * con la ronda bloqueada: entre que se escribe y se envia, otro puede haber subido el precio.
 */
export function CustomBidForm({
  minimum,
  disabled,
  onBid,
}: {
  minimum: number;
  disabled?: boolean;
  onBid: (amount: number) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = value.trim();

    if (!/^\d+$/.test(trimmed)) {
      setError('Escribe una cantidad entera, sin centavos.');
      return;
    }
    const amount = Number(trimmed);
    if (amount < minimum) {
      setError(`La puja debe ser de al menos ${formatCoins(minimum)} ECICoin.`);
      return;
    }

    setError(undefined);
    onBid(amount);
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field
        label="Otra cantidad"
        hint={`Desde ${formatCoins(minimum)} ECICoin.`}
        error={error}
      >
        <Input
          inputMode="numeric"
          autoComplete="off"
          placeholder={String(minimum)}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="secondary" disabled={disabled}>
        Pujar esta cantidad
      </Button>
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/components/ui/button';
import { CoinAmount, formatCoins } from '@/shared/components/ui/coin';
import { Toggle } from '@/shared/components/ui/toggle';
import type { AutoBid, Round } from '../model/auction';
import styles from './auto-bid-panel.module.css';

/**
 * Puja automatica: responde por la persona cuando la superan, siempre por el minimo y solo
 * hasta su limite. Cambiar el limite se confirma explicitamente ("Guardar"), nunca al
 * teclear: es dinero.
 */
export function AutoBidPanel({
  autoBid,
  round,
  nextBid,
  onChange,
  pending,
  editing,
  onEditingChange,
}: {
  autoBid: AutoBid;
  round: Round;
  nextBid: number;
  onChange: (config: { enabled: boolean; limit: number }) => void;
  pending: boolean;
  /** Controlado desde fuera: "Subir mi limite maximo" del aviso de limite abre el editor. */
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();
  const limit = autoBid.limit || nextBid * 2;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(draft);
    if (!Number.isInteger(value) || value < nextBid) {
      setError(`El límite debe ser al menos ${formatCoins(nextBid)} ECICoin.`);
      return;
    }
    setError(undefined);
    onChange({ enabled: true, limit: value });
    onEditingChange(false);
  }

  const status = !autoBid.enabled
    ? {
        tone: styles.off,
        text: 'Puja automática desactivada',
        hint: 'Actívala para no perder la ronda',
      }
    : autoBid.stopped
      ? {
          tone: styles.stopped,
          text: 'Puja automática detenida',
          hint: 'La siguiente puja pasa tu límite',
        }
      : {
          tone: styles.on,
          text: 'Puja automática activa',
          hint: 'Confirmas cada cambio de límite',
        };

  return (
    <section className={styles.panel} aria-label="Puja automática">
      <div className={styles.head}>
        <Toggle
          checked={autoBid.enabled}
          label="Puja automática"
          disabled={pending}
          onChange={(enabled) => onChange({ enabled, limit })}
        />
        <div>
          <h2 className={styles.title}>Puja automática</h2>
          <p className={styles.description}>
            Pujaremos automáticamente por ti, solo hasta tu límite
          </p>
        </div>
      </div>

      <div className={styles.figures}>
        <div className={styles.figure}>
          <span className={styles.label}>Tu oferta actual</span>
          <span className={styles.value}>
            {round.myHighestBid === null
              ? '—'
              : formatCoins(round.myHighestBid)}
          </span>
        </div>
        <div className={styles.figure}>
          <span className={styles.label}>Siguiente puja</span>
          <span className={styles.value}>{formatCoins(nextBid)}</span>
        </div>
      </div>

      {editing ? (
        <form className={styles.limit} onSubmit={save} noValidate>
          <label className={styles.editor}>
            <span className={styles.label}>Nuevo límite máximo</span>
            <input
              inputMode="numeric"
              autoFocus
              value={draft}
              placeholder={String(limit)}
              aria-invalid={error ? true : undefined}
              onChange={(event) =>
                setDraft(event.target.value.replace(/\D/g, ''))
              }
            />
          </label>
          <div className={styles.editActions}>
            <Button variant="quiet" onClick={() => onEditingChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Guardar
            </Button>
          </div>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <div className={styles.limit}>
          <div>
            <span className={styles.label}>Mi límite máximo</span>
            <CoinAmount value={limit} size="lg" />
          </div>
          <Button
            variant="quiet"
            onClick={() => {
              setDraft(String(limit));
              onEditingChange(true);
            }}
          >
            Editar
          </Button>
        </div>
      )}

      <div className={`${styles.status} ${status.tone}`}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.statusText}>{status.text}</span>
        <span className={styles.hint}>{status.hint}</span>
      </div>
    </section>
  );
}

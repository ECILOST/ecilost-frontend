import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { formatCoins } from '@/shared/components/ui/coin';
import { Dialog } from '@/shared/components/ui/dialog';
import { Icon } from '@/shared/components/ui/icon';
import { ItemArt } from '@/shared/components/ui/item-art';
import styles from './bid-confirm-dialogs.module.css';

export interface BidIntent {
  kind: 'bid' | 'buy';
  amount: number;
}

function Frame({
  title,
  onClose,
  itemId,
  itemName,
  children,
}: {
  title: string;
  onClose: () => void;
  itemId: string;
  itemName: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={onClose}
          aria-label="Volver a la sala"
        >
          <Icon name="arrow-left" size={20} />
        </button>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <div className={styles.body}>
        <ItemArt
          seed={itemId}
          label={itemName}
          variant="plain"
          className={styles.art}
        />
        <div className={styles.side}>{children}</div>
      </div>
    </>
  );
}

const coins = (value: number) => `${formatCoins(value)} ECICoin`;

/**
 * Confirmacion con el importe antes de pujar o comprar: "prevencion de errores". Dice cuanto
 * queda despues, no solo cuanto cuesta.
 */
export function ConfirmBidDialog({
  intent,
  onClose,
  onConfirm,
  pending,
  itemId,
  itemName,
  myHighestBid,
  available,
}: {
  intent: BidIntent | null;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  itemId: string;
  itemName: string;
  myHighestBid: number | null;
  /** `null` si la billetera no respondio: se confirma sin cuentas en lugar de inventarlas. */
  available: number | null;
}) {
  const buying = intent?.kind === 'buy';
  return (
    <Dialog
      open={intent !== null}
      onClose={onClose}
      title={buying ? 'Confirmar compra' : 'Confirmar puja'}
    >
      {intent ? (
        <Frame
          title={buying ? 'Confirmar compra' : 'Confirmar puja'}
          onClose={onClose}
          itemId={itemId}
          itemName={itemName}
        >
          <div className={styles.box}>
            <p className={styles.boxTitle}>{itemName}</p>
            <div className={styles.line}>
              <span>Tu puja actual</span>
              <strong>
                {myHighestBid === null ? 'Sin pujar' : coins(myHighestBid)}
              </strong>
            </div>
            <div className={styles.line}>
              <span>{buying ? 'Comprar ahora' : 'Nueva puja'}</span>
              <strong className={styles.yellow}>{coins(intent.amount)}</strong>
            </div>
            <hr className={styles.divider} />
            <div className={styles.line}>
              <span>Saldo disponible</span>
              <strong>{available === null ? '—' : coins(available)}</strong>
            </div>
            <div className={styles.line}>
              <span>
                Saldo restante tras {buying ? 'la compra' : 'la puja'}
              </span>
              <strong className={styles.cyan}>
                {available === null ? '—' : coins(available - intent.amount)}
              </strong>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="bid"
              size="lg"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending
                ? 'Enviando...'
                : buying
                  ? '⚡ Confirmar compra'
                  : '⚡ Confirmar puja'}
            </Button>
          </div>
        </Frame>
      ) : null}
    </Dialog>
  );
}

/** Saldo insuficiente: cuanto hay, cuanto hace falta y cuanto falta exactamente. */
export function InsufficientDialog({
  intent,
  onClose,
  itemId,
  itemName,
  available,
}: {
  intent: BidIntent | null;
  onClose: () => void;
  itemId: string;
  itemName: string;
  available: number;
}) {
  return (
    <Dialog
      open={intent !== null}
      onClose={onClose}
      title="Saldo insuficiente"
      tone="pink"
    >
      {intent ? (
        <Frame
          title="Error de pago"
          onClose={onClose}
          itemId={itemId}
          itemName={itemName}
        >
          <p className={styles.alert}>Saldo insuficiente</p>
          <p className={styles.alertText}>
            No tienes suficientes ECICoins para esta puja.
          </p>
          <div className={`${styles.box} ${styles.boxPink}`}>
            <div className={styles.line}>
              <span>
                {intent.kind === 'buy' ? 'Comprar ahora' : 'Nueva puja'}
              </span>
              <strong className={styles.yellow}>{coins(intent.amount)}</strong>
            </div>
            <div className={styles.line}>
              <span>Saldo disponible</span>
              <strong className={styles.pink}>{coins(available)}</strong>
            </div>
            <hr className={styles.divider} />
            <div className={styles.line}>
              <span>Te faltan</span>
              <strong className={`${styles.pink} ${styles.big}`}>
                {coins(intent.amount - available)}
              </strong>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Volver a la sala
            </Button>
            <Link className={buttonClass('primary', 'lg')} to={routes.wallet}>
              Recargar ECICoin
            </Link>
          </div>
        </Frame>
      ) : null}
    </Dialog>
  );
}

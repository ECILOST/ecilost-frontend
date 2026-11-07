import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { formatDateTime } from '@/shared/format/date';
import { formatEcicoin } from '../domain/ecicoin';
import { TRANSACTION_TYPE } from '../domain/transaction-type';
import { useWalletTransactions } from '../hooks/use-wallet-transactions';
import styles from './transaction-history.module.css';

/** Historial de movimientos de la billetera propia (HU-10), del mas reciente al mas antiguo. */
export function TransactionHistory() {
  const {
    data,
    isPending,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useWalletTransactions();
  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  if (isPending) return <Loading label="Cargando tus movimientos..." />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (transactions.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <Icon name="swap" size={24} />
        </span>
        <p>Todavía no tienes movimientos.</p>
        <small>
          Aquí verás tus recargas, lo que retienen tus pujas y lo que pagas al
          ganar.
        </small>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.list}>
        {transactions.map((transaction) => {
          const type = TRANSACTION_TYPE[transaction.type];
          return (
            <li key={transaction.id} className={styles.row}>
              <span
                className={`${styles.kind} ${type.sign === '+' ? styles.kindIn : styles.kindOut}`}
                aria-hidden="true"
              >
                <Icon
                  name={type.sign === '+' ? 'arrow-down' : 'arrow-up'}
                  size={18}
                />
              </span>
              <span className={styles.label}>{type.label}</span>
              <span className={styles.when}>
                {formatDateTime(transaction.createdAt)}
              </span>
              <strong
                className={`u-numeric ${type.sign === '+' ? styles.in : styles.out}`}
              >
                {type.sign} {formatEcicoin(transaction.amount)}
              </strong>
            </li>
          );
        })}
      </ul>
      {hasNextPage ? (
        <Button
          variant="secondary"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? 'Cargando...' : 'Ver movimientos anteriores'}
        </Button>
      ) : null}
    </>
  );
}

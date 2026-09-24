import { useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { buttonClass } from '@/shared/components/ui/button';
import { CoinAmount, formatCoins } from '@/shared/components/ui/coin';
import { ItemArt } from '@/shared/components/ui/item-art';
import { Pill, pillClass } from '@/shared/components/ui/pill';
import { useMyBids } from '../hooks/use-my-bids';
import type { MyBid, MyBidStatus } from '../model/auction';
import styles from './my-bids.page.module.css';

const STATUS: Record<
  MyBidStatus,
  { label: string; tone: 'cyan' | 'pink' | 'neutral'; row?: string }
> = {
  WINNING: { label: 'Ganando', tone: 'cyan', row: styles.winning },
  OUTBID: { label: 'Superado', tone: 'pink', row: styles.outbid },
  WON: { label: 'Ganada', tone: 'cyan' },
  LOST: { label: 'Perdida', tone: 'neutral' },
};

function Row({ bid }: { bid: MyBid }) {
  const status = STATUS[bid.status];
  return (
    <li>
      <Link
        className={[styles.row, status.row].filter(Boolean).join(' ')}
        to={routes.room(bid.roomId)}
      >
        <ItemArt
          seed={bid.itemId}
          label={bid.itemName}
          variant="thumb"
          className={styles.thumb}
        />
        <div className={styles.text}>
          <span className={styles.name}>{bid.itemName}</span>
          <span className={styles.detail}>{bid.detail}</span>
          {bid.autoBidLimit !== null ? (
            <Pill tone="cyan">
              Puja automática hasta {formatCoins(bid.autoBidLimit)}
            </Pill>
          ) : null}
          {bid.outbidBy !== null ? (
            <Pill tone="pink">
              Te superaron por {formatCoins(bid.outbidBy)} ECICoin
            </Pill>
          ) : null}
        </div>
        <div className={styles.amount}>
          <span className={styles.amountLabel}>
            {bid.status === 'WON' ? 'Precio final' : 'Tu oferta'}
          </span>
          <CoinAmount value={bid.amount} size="lg" />
        </div>
        <Pill
          tone={status.tone}
          solid={bid.status !== 'LOST' && bid.status !== 'WON'}
          className={bid.status === 'WON' ? styles.wonPill : undefined}
        >
          {status.label}
        </Pill>
      </Link>
    </li>
  );
}

/** Mis pujas: las activas (ganando o superado) y el historial (ganadas y perdidas). */
export function MyBidsPage() {
  const { data: bids, isPending, isError, error, refetch } = useMyBids();
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const active =
    bids?.filter(
      (bid) => bid.status === 'WINNING' || bid.status === 'OUTBID',
    ) ?? [];
  const history =
    bids?.filter((bid) => bid.status === 'WON' || bid.status === 'LOST') ?? [];
  const committed = active
    .filter((bid) => bid.status === 'WINNING')
    .reduce((sum, bid) => sum + bid.amount, 0);
  const visible = tab === 'active' ? active : history;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis pujas</h1>
          <p className={styles.subtitle}>
            {active.length} activas · {formatCoins(committed)} ECICoin
            comprometidos
          </p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Mis pujas">
          {(
            [
              ['active', 'Activas'],
              ['history', 'Historial'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={pillClass('neutral', {
                interactive: true,
                selected: tab === value,
              })}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? <Loading label="Cargando tus pujas..." /> : null}
      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {bids && visible.length === 0 ? (
        <EmptyState
          title={
            tab === 'active'
              ? 'No tienes pujas activas'
              : 'Todavía no hay historial'
          }
          actions={
            <Link className={buttonClass('primary')} to={routes.auctions}>
              Ver subastas
            </Link>
          }
        >
          {tab === 'active'
            ? 'Cuando pujes en una sala en curso, la verás aquí con su estado en vivo.'
            : 'Aquí quedan las subastas que ganaste o perdiste.'}
        </EmptyState>
      ) : null}

      {visible.length > 0 ? (
        <ul className={styles.list}>
          {visible.map((bid) => (
            <Row key={bid.id} bid={bid} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

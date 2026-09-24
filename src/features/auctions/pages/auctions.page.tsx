import { useState } from 'react';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Icon } from '@/shared/components/ui/icon';
import { pillClass } from '@/shared/components/ui/pill';
import { AuctionCard } from '../components/auction-card';
import { useAuctionItems } from '../hooks/use-auction-items';
import type { AuctionItemStatus } from '../model/auction';
import styles from './auctions.page.module.css';

const FILTERS: Array<{ value: AuctionItemStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'LIVE', label: 'En vivo' },
  { value: 'UPCOMING', label: 'Próximas' },
  { value: 'CLOSED', label: 'Finalizadas' },
];

/** Quita tildes y mayusculas: "audifonos" encuentra "Audífonos". */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Catalogo de subastas: todo lo que esta, estuvo o estara en una sala. */
export function AuctionsPage() {
  const { data: items, isPending, isError, error, refetch } = useAuctionItems();
  const [filter, setFilter] = useState<AuctionItemStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const query = normalize(search.trim());
  const visible = (items ?? [])
    .filter((item) => filter === 'ALL' || item.status === filter)
    .filter(
      (item) =>
        !query || normalize(`${item.name} ${item.category}`).includes(query),
    );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Catálogo de subastas</h1>
          <p className={styles.subtitle}>
            Descubre, puja y llévatelos
            {items ? ` · ${items.length} objetos` : ''}
          </p>
        </div>
        <label className={styles.search}>
          <Icon name="search" size={15} />
          <span className="u-sr-only">Buscar objetos</span>
          <input
            type="search"
            placeholder="Buscar objetos..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div
        className={styles.filters}
        role="group"
        aria-label="Filtrar por estado"
      >
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={pillClass('neutral', {
              interactive: true,
              selected: filter === option.value,
            })}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isPending ? <Loading label="Cargando el catálogo..." /> : null}
      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {items && visible.length === 0 ? (
        <EmptyState title="No hay objetos con ese filtro">
          Prueba con otro estado o con otra búsqueda.
        </EmptyState>
      ) : null}

      {visible.length > 0 ? (
        <ul className={styles.grid}>
          {visible.map((item) => (
            <li key={item.id}>
              <AuctionCard item={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

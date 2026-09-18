import { useState } from 'react';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button } from '@/shared/components/ui/button';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { ItemCard } from '../components/item-card';
import {
  StatusFilter,
  type StatusFilterValue,
} from '../components/status-filter';
import { useItems } from '../hooks/use-items';
import styles from './items.page.module.css';

/**
 * Catalogo de objetos perdidos.
 *
 * La pantalla no habla con la red: pide el caso de uso (`useItems`) y se limita a decidir
 * que se ve en cada estado. Es el reparto que en el back separa al controlador del servicio.
 */
export function ItemsPage() {
  const [status, setStatus] = useState<StatusFilterValue>('');
  const {
    data: items,
    isPending,
    error,
    refetch,
  } = useItems(status ? { status } : {});

  return (
    <Page>
      <PageHeader eyebrow="Objetos perdidos" title="Catálogo" />

      <div className={styles.toolbar}>
        <StatusFilter value={status} onChange={setStatus} />
        {items ? (
          <p className={styles.count} aria-live="polite">
            {items.length} {items.length === 1 ? 'objeto' : 'objetos'}
          </p>
        ) : null}
      </div>

      {isPending ? <Loading label="Cargando el catálogo..." /> : null}
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {items?.length === 0 ? (
        <EmptyState
          title="No hay objetos con ese filtro"
          actions={
            status ? (
              <Button variant="secondary" onClick={() => setStatus('')}>
                Ver todos
              </Button>
            ) : null
          }
        >
          Prueba con otro estado: los objetos aparecen aquí en cuanto un
          funcionario los registra.
        </EmptyState>
      ) : null}

      {items?.length ? (
        <ul className={styles.grid}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
    </Page>
  );
}

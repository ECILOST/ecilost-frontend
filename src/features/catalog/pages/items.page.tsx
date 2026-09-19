import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useSession } from '@/features/auth/hooks/use-session';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { CategoryFilter } from '../components/category-filter';
import { ItemCard, ItemCardSkeleton } from '../components/item-card';
import {
  StatusFilter,
  type StatusFilterValue,
} from '../components/status-filter';
import { useItems } from '../hooks/use-items';
import type { ListItemsQuery } from '../model/item';
import styles from './items.page.module.css';

/** Cuantos huecos se pintan mientras llega la primera pagina. */
const SKELETONS = 6;

/**
 * Catalogo de objetos perdidos.
 *
 * La pantalla no habla con la red: pide el caso de uso (`useItems`) y se limita a decidir
 * que se ve en cada estado. Es el reparto que en el back separa al controlador del servicio.
 */
export function ItemsPage() {
  const [status, setStatus] = useState<StatusFilterValue>('');
  const [category, setCategory] = useState('');
  const { principal } = useSession();

  // Los filtros vacios no se mandan: el servicio distingue entre "sin filtro" y un filtro
  // con valor vacio, y el segundo no encuentra nada.
  const query: ListItemsQuery = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
  };

  const {
    data,
    isPending,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useItems(query);

  const items = data?.pages.flat() ?? [];
  const filtered = Boolean(status || category);

  /**
   * Las categorias se acumulan en vez de recalcularse en cada consulta: filtrando por una,
   * la respuesta solo trae esa, y recalcular dejaria el filtro con una sola opcion y sin
   * forma de volver. Funciona porque la primera consulta siempre sale sin filtros.
   */
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    const seen = data?.pages.flat() ?? [];
    setCategories((current) => {
      const merged = new Set(current);
      for (const item of seen) merged.add(item.category);
      return merged.size === current.length
        ? current
        : [...merged].sort((a, b) => a.localeCompare(b, 'es'));
    });
  }, [data]);

  return (
    <Page>
      <PageHeader
        eyebrow="Objetos perdidos"
        title="Catálogo"
        actions={
          // Es un enlace vestido de boton, no un boton que navega: asi conserva el
          // ctrl+clic, el menu contextual y el anuncio correcto del lector de pantalla.
          principal?.canManageCatalog ? (
            <Link className={buttonClass('primary')} to={routes.newItem}>
              <Icon name="plus" size={18} />
              Registrar objeto
            </Link>
          ) : null
        }
      />

      <Flash />

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <StatusFilter value={status} onChange={setStatus} />
          <CategoryFilter
            value={category}
            categories={categories}
            onChange={setCategory}
          />
        </div>

        {/*
          Cuantos se estan viendo. Mientras queden paginas dice "Mostrando" y no un total:
          el servicio no informa de cuantos hay, y un numero a secas se leeria como el total
          cuando no lo es.
        */}
        {isPending ? null : (
          <p className={styles.count} aria-live="polite">
            {hasNextPage
              ? `Mostrando ${items.length}`
              : `${items.length} ${items.length === 1 ? 'objeto' : 'objetos'}`}
          </p>
        )}
      </div>

      {/*
        Huecos con la forma de las tarjetas, no un rotulo de "cargando": asi la rejilla no
        da un salto cuando llegan los datos, que es lo que hace perder el sitio donde se
        estaba mirando.
      */}
      {isPending ? (
        <ul className={styles.grid}>
          {Array.from({ length: SKELETONS }, (_, index) => (
            <ItemCardSkeleton key={index} />
          ))}
        </ul>
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : null}

      {!isPending && !error && items.length === 0 ? (
        <EmptyState
          title={
            filtered
              ? 'No hay objetos con ese filtro'
              : 'Todavía no hay objetos en el catálogo'
          }
          actions={
            filtered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus('');
                  setCategory('');
                }}
              >
                Quitar los filtros
              </Button>
            ) : null
          }
        >
          {filtered
            ? 'Prueba con otro estado o con otra categoría.'
            : 'Los objetos aparecen aquí en cuanto un funcionario los registra.'}
        </EmptyState>
      ) : null}

      {items.length > 0 ? (
        <ul className={styles.grid}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </ul>
      ) : null}

      {hasNextPage ? (
        <div className={styles.more}>
          <Button
            variant="secondary"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
          </Button>
        </div>
      ) : null}
    </Page>
  );
}

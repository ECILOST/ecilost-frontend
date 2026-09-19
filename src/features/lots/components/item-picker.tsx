import { ItemStatus } from '@/features/catalog/domain/item-status';
import { useItems } from '@/features/catalog/hooks/use-items';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { Button } from '@/shared/components/ui/button';
import { Notice } from '@/shared/components/ui/notice';
import { Pill } from '@/shared/components/ui/pill';
import { MIN_LOT_ITEMS, type LotItem } from '../model/lot';
import styles from './item-picker.module.css';

/**
 * Elige los objetos que van a formar un lote.
 *
 * Solo ofrece los disponibles, que es la unica condicion que el servicio acepta: un objeto
 * retirado, vendido, en otro lote o comprometido en una ronda hace fallar la creacion
 * entera. Pedirselos filtrados al servicio, en vez de traerlos todos y tachar los que no
 * valen, evita enseñar una lista llena de opciones que no se pueden elegir.
 *
 * Aun asi la comprobacion de verdad es del servicio: entre que se pinta esta lista y se
 * pulsa el boton, otro funcionario puede haberse llevado uno.
 */
export function ItemPicker({
  selected,
  onToggle,
  disabled,
}: {
  selected: LotItem[];
  onToggle: (item: LotItem) => void;
  disabled?: boolean;
}) {
  const {
    data,
    isPending,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useItems({ status: ItemStatus.AVAILABLE });

  const items = data?.pages.flat() ?? [];
  const chosen = new Set(selected.map((item) => item.id));

  if (isPending) return <Loading label="Buscando objetos disponibles..." />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (items.length === 0) {
    return (
      <EmptyState title="No hay objetos disponibles">
        Un lote se arma con objetos disponibles. Ahora mismo todos están
        retirados, vendidos o ya reservados en otro lote.
      </EmptyState>
    );
  }

  if (items.length < MIN_LOT_ITEMS) {
    return (
      <Notice tone="alert" title="Hace falta al menos otro objeto disponible">
        Un lote agrupa {MIN_LOT_ITEMS} objetos o más, y ahora mismo solo hay uno
        disponible. Registra otro objeto, o repón alguno de los retirados.
      </Notice>
    );
  }

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>
        Objetos del lote
        <span className={styles.count}>
          {selected.length} de {items.length} elegidos
        </span>
      </legend>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <label className={styles.row}>
              <input
                className={styles.check}
                type="checkbox"
                checked={chosen.has(item.id)}
                disabled={disabled}
                onChange={() => onToggle({ id: item.id, name: item.name })}
              />
              <span className={styles.name}>{item.name}</span>
              <Pill tone="blue">{item.category}</Pill>
            </label>
          </li>
        ))}
      </ul>

      {hasNextPage ? (
        <Button
          variant="secondary"
          disabled={isFetchingNextPage || disabled}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? 'Cargando...' : 'Ver más objetos'}
        </Button>
      ) : null}
    </fieldset>
  );
}

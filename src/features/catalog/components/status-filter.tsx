import { ITEM_STATUS_LABELS, ItemStatus } from '../domain/item-status';
import { FilterPills, type FilterOption } from './filter-pills';

/** Cadena vacia = sin filtro. Es el valor que el catalogo traduce a "no mandes `status`". */
export type StatusFilterValue = ItemStatus | '';

const OPTIONS: FilterOption<ItemStatus>[] = [
  { value: '', label: 'Todos' },
  ...Object.values(ItemStatus).map((value) => ({
    value,
    label: ITEM_STATUS_LABELS[value],
  })),
];

/**
 * Filtro por estado. Las opciones son las cinco del enum mas "Todos", y se escriben una vez
 * a partir del propio enum: una lista copiada a mano se queda vieja el dia que el servicio
 * añada un estado.
 */
export function StatusFilter({
  value,
  onChange,
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}) {
  return (
    <FilterPills
      legend="Filtrar por estado"
      name="estado"
      value={value}
      options={OPTIONS}
      onChange={onChange}
    />
  );
}

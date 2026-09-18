import { pillClass } from '@/shared/components/ui/pill';
import { ITEM_STATUS_LABELS, ItemStatus } from '../domain/item-status';
import styles from './status-filter.module.css';

/** Cadena vacia = sin filtro. Es el valor que el catalogo traduce a "no mandes `status`". */
export type StatusFilterValue = ItemStatus | '';

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: '', label: 'Todos' },
  ...Object.values(ItemStatus).map((value) => ({
    value: value as StatusFilterValue,
    label: ITEM_STATUS_LABELS[value],
  })),
];

/**
 * Filtro de estado como fila de capsulas.
 *
 * Por debajo son botones de radio de verdad, no `<div>` con `onClick`: asi el grupo se
 * recorre con las flechas, se anuncia como "Filtrar por estado" y el navegador se encarga
 * de que solo haya uno activo. La capsula es unicamente la piel.
 *
 * Se eligio fila de capsulas y no un desplegable porque son seis opciones fijas: reconocer
 * gana a recordar, y aqui el estado actual del filtro se ve sin abrir nada.
 */
export function StatusFilter({
  value,
  onChange,
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}) {
  return (
    <fieldset className={styles.filter}>
      <legend className="u-sr-only">Filtrar por estado</legend>

      <div className={styles.row}>
        {OPTIONS.map((option) => (
          <label
            key={option.value || 'todos'}
            className={`${styles.option} ${pillClass('neutral', {
              interactive: true,
              selected: value === option.value,
            })}`}
          >
            <input
              className="u-sr-only"
              type="radio"
              name="estado"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

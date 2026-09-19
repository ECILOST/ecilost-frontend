import { pillClass } from '@/shared/components/ui/pill';
import styles from './filter-pills.module.css';

export interface FilterOption<T extends string> {
  /** Cadena vacia = sin filtro. Es lo que el catalogo traduce a "no mandes el parametro". */
  value: T | '';
  label: string;
}

export interface FilterPillsProps<T extends string> {
  /** Para que es este grupo. No se ve; lo lee el lector de pantalla al entrar. */
  legend: string;
  /** Nombre del grupo de radios. Dos grupos con el mismo nombre se desactivan entre si. */
  name: string;
  value: T | '';
  options: FilterOption<T>[];
  onChange: (value: T | '') => void;
}

/**
 * Un filtro como fila de capsulas.
 *
 * Por debajo son botones de radio de verdad, no `<div>` con `onClick`: asi el grupo se
 * recorre con las flechas, se anuncia con su titulo y el navegador se encarga de que solo
 * haya uno activo. La capsula es unicamente la piel.
 *
 * Se eligio fila de capsulas y no un desplegable porque las opciones son pocas y estan a la
 * vista: reconocer gana a recordar, y asi el filtro puesto se ve sin abrir nada.
 */
export function FilterPills<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: FilterPillsProps<T>) {
  return (
    <fieldset className={styles.filter}>
      <legend className="u-sr-only">{legend}</legend>

      <div className={styles.row}>
        {options.map((option) => (
          <label
            key={option.value || `${name}-todos`}
            className={`${styles.option} ${pillClass('neutral', {
              interactive: true,
              selected: value === option.value,
            })}`}
          >
            <input
              className="u-sr-only"
              type="radio"
              name={name}
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

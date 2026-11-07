import type { CSSProperties } from 'react';
import { Icon } from '@/shared/components/ui/icon';
import type { MysteryEntry } from '../../model/auction';
import styles from './dynamic.module.css';

/**
 * Las pistas de un lote misterioso: lo unico que se sabe del objeto hasta que alguien lo gane.
 * Cada pista es una tarjeta numerada, como las de un juego de adivinanzas: se leen en orden y
 * la ultima siempre es la mas especifica.
 */
export function MysteryClues({ entries }: { entries: MysteryEntry[] }) {
  const chips = entries.flatMap((entry) =>
    entry.kind === 'ITEM'
      ? [entry.category, `Estado: ${entry.condition}`, ...entry.clues]
      : [`Lote de ${entry.itemCount} objetos`, ...entry.categories, ...entry.clues],
  );
  const clues = [...new Set(chips)];

  return (
    <div className={`${styles.panel} ${styles.modePanel}`} style={{ '--mode': 'var(--eci-purple)' } as CSSProperties}>
      <div className={styles.panelHead}>
        <span className={styles.modeBadge}>
          <Icon name="help" size={15} /> Lote misterioso
        </span>
        <span className={styles.liveTag}>
          {clues.length} {clues.length === 1 ? 'pista' : 'pistas'}
        </span>
      </div>
      <p className={styles.label}>Pistas</p>
      {clues.length ? (
        <ol className={styles.clues}>
          {clues.map((clue, index) => (
            <li key={clue} className={styles.clue} style={{ animationDelay: `${index * 70}ms` }}>
              <span className={styles.clueNumber} aria-hidden="true">
                <Icon name="search" size={14} />
                {index + 1}
              </span>
              <span>{clue}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.muted}>Las pistas aparecen en un momento…</p>
      )}
      <p className={styles.mysteryNote}>
        <Icon name="sparkle" size={15} />
        El objeto se revela solo a quien gane la ronda.
      </p>
    </div>
  );
}

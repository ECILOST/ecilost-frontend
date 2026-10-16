import type { MysteryEntry } from '../../model/auction';
import styles from './dynamic.module.css';

/** Las pistas de un lote misterioso: lo unico que se sabe del objeto hasta que alguien lo gane. */
export function MysteryClues({ entries }: { entries: MysteryEntry[] }) {
  const chips = entries.flatMap((entry) =>
    entry.kind === 'ITEM'
      ? [entry.category, `Estado: ${entry.condition}`, ...entry.clues]
      : [`Lote de ${entry.itemCount} objetos`, ...entry.categories, ...entry.clues],
  );

  return (
    <div>
      <p className={styles.label}>Pistas</p>
      {chips.length ? (
        <div className={styles.chips} style={{ marginTop: '0.4rem' }}>
          {[...new Set(chips)].map((clue) => (
            <span key={clue} className={styles.clue}>
              🔎 {clue}
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.muted}>Las pistas aparecen en un momento…</p>
      )}
      <p className={styles.muted} style={{ marginTop: '0.5rem' }}>
        El objeto se revela solo a quien gane la ronda.
      </p>
    </div>
  );
}

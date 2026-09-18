import styles from './loading.module.css';

/**
 * Espera. `role="status"` la anuncia sin robar el foco, y el texto dice que se esta
 * cargando en concreto: "Cargando..." obliga a adivinar que parte de la pantalla falta.
 */
export function Loading({ label = 'Cargando...' }: { label?: string }) {
  return (
    <p className={styles.loading} role="status">
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      {label}
    </p>
  );
}

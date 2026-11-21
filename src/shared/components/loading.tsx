import { SkeletonBlock, type SkeletonLayout } from './ui/skeleton';
import styles from './loading.module.css';

/**
 * Espera. `role="status"` la anuncia sin robar el foco, y el texto dice que se esta
 * cargando en concreto: "Cargando..." obliga a adivinar que parte de la pantalla falta.
 *
 * Con `skeleton`, ademas del texto se pinta el hueco con la forma del contenido final
 * (filas, tarjetas o ficha): la espera se siente mas corta y la pantalla no salta al llegar
 * los datos. Sin el, quedan los tres puntos, para esperas pequeñas dentro de un panel.
 */
export function Loading({
  label = 'Cargando...',
  skeleton,
  count,
}: {
  label?: string;
  skeleton?: SkeletonLayout;
  count?: number;
}) {
  if (skeleton) {
    return (
      <div className={styles.block}>
        <p className={styles.srOnly} role="status">
          {label}
        </p>
        <SkeletonBlock layout={skeleton} count={count} />
      </div>
    );
  }

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

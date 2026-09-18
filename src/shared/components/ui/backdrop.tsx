import styles from './backdrop.module.css';

/**
 * Capa de color del fondo. Es puramente decorativa, asi que se oculta a los lectores de
 * pantalla y no recibe puntero: nada de lo que hay aqui es informacion.
 */
export function Backdrop({ variant = 'app' }: { variant?: 'app' | 'splash' }) {
  return (
    <div
      className={[styles.backdrop, variant === 'splash' ? styles.splash : '']
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <span className={`${styles.blob} ${styles.one}`} />
      <span className={`${styles.blob} ${styles.two}`} />
      <span className={`${styles.blob} ${styles.three}`} />
    </div>
  );
}

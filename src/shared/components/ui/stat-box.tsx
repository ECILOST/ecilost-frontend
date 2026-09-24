import type { ReactNode } from 'react';
import styles from './stat-box.module.css';

/**
 * Rotulo pequeño y dato debajo: categoria, participantes, "tu oferta actual". El diseño la
 * repite en casi todas las pantallas con la misma forma.
 */
export function StatBox({
  label,
  value,
  align = 'start',
  tone,
  size = 'md',
  className,
}: {
  label: string;
  value: ReactNode;
  align?: 'start' | 'center';
  tone?: 'cyan' | 'yellow' | 'pink';
  /** `lg`: cifra grande en Exo 2 (sala de espera, resumen). */
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <div
      className={[
        styles.box,
        styles[align],
        styles[size],
        tone ? styles[tone] : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {size === 'lg' ? (
        <>
          <span className={styles.value}>{value}</span>
          <span className={styles.label}>{label}</span>
        </>
      ) : (
        <>
          <span className={styles.label}>{label}</span>
          <span className={styles.value}>{value}</span>
        </>
      )}
    </div>
  );
}

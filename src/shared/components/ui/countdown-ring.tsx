import type { CSSProperties } from 'react';
import styles from './countdown-ring.module.css';

/**
 * Reloj circular del diseño: aro rosa que se vacia y la cuenta en el centro.
 *
 * `progress` es la fraccion que queda (0..1). El texto lo decide quien lo usa, para que el
 * mismo aro sirva de "Termina en" en la sala y de "Restante" en la ficha.
 */
export function CountdownRing({
  time,
  label = 'Termina en',
  progress,
  size = 118,
  className,
}: {
  time: string;
  label?: string;
  progress: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const style = {
    '--size': `${size}px`,
    '--progress': `${Math.round(clamped * 100)}%`,
  } as CSSProperties;

  return (
    <div
      className={[styles.ring, className].filter(Boolean).join(' ')}
      style={style}
      role="timer"
      aria-label={`${label} ${time}`}
    >
      <div className={styles.face}>
        <span className={styles.label}>{label}</span>
        <span className={styles.time}>{time}</span>
      </div>
    </div>
  );
}

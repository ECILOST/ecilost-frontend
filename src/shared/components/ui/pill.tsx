import type { ReactNode } from 'react';
import styles from './pill.module.css';

export type PillTone =
  'neutral' | 'mint' | 'coral' | 'amber' | 'blue' | 'violet';

export interface PillOptions {
  /** Version pulsable: filtros y pestañas. */
  interactive?: boolean;
  selected?: boolean;
}

/**
 * La capsula es la pieza que mas se repite en la interfaz: etiqueta de estado, filtro,
 * categoria, indicador de ronda. Las clases se exponen sueltas para que un `<label>` de
 * filtro use exactamente el mismo estilo que una etiqueta, sin copiarlo.
 */
export function pillClass(
  tone: PillTone = 'neutral',
  options: PillOptions = {},
): string {
  return [
    styles.pill,
    styles[tone],
    options.interactive ? styles.interactive : '',
    options.selected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export interface PillProps extends PillOptions {
  tone?: PillTone;
  /** Punto del color del tono, para estados que se leen de un vistazo. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Pill({
  tone = 'neutral',
  dot,
  children,
  className,
  ...options
}: PillProps) {
  return (
    <span
      className={[pillClass(tone, options), className]
        .filter(Boolean)
        .join(' ')}
    >
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

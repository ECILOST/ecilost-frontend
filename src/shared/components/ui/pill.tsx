import type { ReactNode } from 'react';
import styles from './pill.module.css';

export type PillTone =
  'neutral' | 'cyan' | 'pink' | 'yellow' | 'blue' | 'purple' | 'green';

export interface PillOptions {
  /** Relleno opaco, para cuando la capsula va encima de una fotografia. */
  solid?: boolean;
  /** Version pulsable: filtros y pestañas. */
  interactive?: boolean;
  selected?: boolean;
}

/**
 * La capsula es la pieza que mas se repite en la interfaz. Las clases se exponen sueltas
 * para que un `<label>` de filtro use exactamente el mismo estilo que una etiqueta, sin
 * copiarlo.
 */
export function pillClass(
  tone: PillTone = 'neutral',
  options: PillOptions = {},
): string {
  return [
    styles.pill,
    styles[tone],
    options.solid ? styles.solid : '',
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
  /** El punto late: lo que esta pasando ahora mismo ("En vivo"). */
  live?: boolean;
  children: ReactNode;
  className?: string;
}

export function Pill({
  tone = 'neutral',
  dot,
  live,
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
      {dot || live ? (
        <span
          className={[styles.dot, live ? styles.live : '']
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

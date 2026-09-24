import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './dialog.module.css';

/**
 * Ventana modal sobre la pantalla. Es la pieza de los estados de la subasta (vas ganando,
 * te superaron...) y de las confirmaciones.
 *
 * No usa `<dialog>` nativo porque jsdom no implementa `showModal()` y las pruebas de
 * pantalla lo necesitan; a cambio cumple lo mismo a mano: rol, titulo, Escape y foco.
 */
export function Dialog({
  open,
  onClose,
  title,
  tone = 'neutral',
  size = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Nombre accesible. Puede ir oculto si el titulo visible es un rotulo grafico. */
  title: string;
  /** Color del borde: el estado se reconoce antes de leerlo. */
  tone?: 'neutral' | 'cyan' | 'pink' | 'yellow';
  size?: 'md' | 'lg';
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={panel}
        className={[styles.panel, styles[tone], styles[size]].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <span id={titleId} className="u-sr-only">
          {title}
        </span>
        {children}
      </div>
    </div>
  );
}

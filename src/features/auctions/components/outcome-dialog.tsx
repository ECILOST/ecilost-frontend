import type { ReactNode } from 'react';
import { Dialog } from '@/shared/components/ui/dialog';
import { ItemArt } from '@/shared/components/ui/item-art';
import styles from './outcome-dialog.module.css';

export type OutcomeTone = 'cyan' | 'pink' | 'yellow';

/**
 * Los estados de la subasta son pantallas, no mensajes: una mancha grande del color del
 * estado a la izquierda con el objeto encima, y a la derecha el rotulo en capsula, las
 * cifras y dos salidas. El color se entiende antes de leer; el texto lo confirma.
 */
export function OutcomeDialog({
  open,
  onClose,
  tone,
  heading,
  subtitle,
  itemId,
  itemName,
  confetti = false,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  tone: OutcomeTone;
  heading: string;
  subtitle?: ReactNode;
  itemId: string;
  itemName: string;
  confetti?: boolean;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={heading} tone={tone}>
      <div className={`${styles.layout} ${styles[tone]}`}>
        <span className={styles.stain} aria-hidden="true" />
        <span className={styles.corner} aria-hidden="true" />
        {confetti ? (
          <span className={styles.confetti} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : null}

        <div className={styles.artWrap}>
          <ItemArt
            seed={itemId}
            label={itemName}
            variant="plain"
            className={styles.art}
          />
        </div>

        <div className={styles.content}>
          <p className={styles.heading} aria-hidden="true">
            {heading}
          </p>
          {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
          {children}
          <div className={styles.actions}>{actions}</div>
        </div>
      </div>
    </Dialog>
  );
}

/** Caja oscura con rotulo y cifra, dentro de un estado. */
export function OutcomeFigure({
  label,
  children,
  highlight = false,
}: {
  label: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={[styles.figure, highlight ? styles.figureStrong : '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.figureLabel}>{label}</span>
      <span className={styles.figureValue}>{children}</span>
    </div>
  );
}

export function OutcomeRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

/** Franja con borde del color del estado: puja automatica, tiempo restante. */
export function OutcomeStrip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: OutcomeTone;
}) {
  return (
    <div className={`${styles.strip} ${styles[`strip-${tone}`]}`}>
      {children}
    </div>
  );
}

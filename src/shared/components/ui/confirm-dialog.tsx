import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './button';
import styles from './confirm-dialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Que se va a perder o a cambiar. Nombrar el objeto concreto evita el "¿cual era?". */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para lo irreversible. Lo reversible no merece un boton rojo. */
  tone?: 'danger' | 'primary';
  /** En marcha: los dos botones se bloquean para no mandar la operacion dos veces. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmacion antes de una accion que no se deshace.
 *
 * Es un `<dialog>` nativo abierto con `showModal()`, no un div con posicion fija. El
 * elemento del navegador ya atrapa el foco, cierra con Escape, oculta el resto de la pagina
 * a los lectores de pantalla y se pinta en la capa superior sin pelear con ningun z-index.
 * Reimplementar eso a mano es la forma habitual de dejar un modal que se puede tabular por
 * detras.
 *
 * El dialogo no decide si esta abierto: lo recibe. Asi el estado vive donde esta la
 * operacion que se va a confirmar, y no hay dos sitios que puedan discrepar.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    // Se comprueba `element.open` antes de llamar: abrir un dialogo ya abierto lanza.
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      // Escape dispara `cancel`. Se corta el cierre que haria el navegador por su cuenta y
      // se avisa hacia arriba, porque quien abrio el dialogo es quien tiene que cerrarlo.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      /*
       * Clic en el fondo. El navegador no lo trata como cancelacion, asi que se reconoce
       * por el destino del clic: el panel es un hijo, de modo que si el destino es el
       * propio <dialog> lo que se pulso fue el fondo.
       */
      onClick={(event) => {
        if (event.target === dialog.current && !busy) onCancel();
      }}
    >
      <div className={styles.panel}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {children ? <div className={styles.body}>{children}</div> : null}

        <div className={styles.actions}>
          {/*
            Cancelar recibe el foco al abrir. Ante una pregunta que puede borrar algo, la
            tecla Enter pulsada por inercia debe caer en la opcion que no rompe nada.
          */}
          <Button
            variant="secondary"
            disabled={busy}
            autoFocus
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button variant={tone} disabled={busy} onClick={onConfirm}>
            {busy ? 'Un momento...' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

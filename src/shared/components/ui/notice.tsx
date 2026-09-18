import type { ReactNode } from 'react';
import styles from './notice.module.css';

export type NoticeTone = 'neutral' | 'alert' | 'mint';

export interface NoticeProps {
  title: string;
  tone?: NoticeTone;
  children?: ReactNode;
  /** Lista de detalles, como los campos que rechazo una validacion. */
  details?: string[];
  /** Botones o enlaces: un aviso sin salida deja a la persona encallada. */
  actions?: ReactNode;
  /**
   * `alert` interrumpe al lector de pantalla, `status` espera su turno. Un error merece lo
   * primero; una lista vacia, ninguno de los dos.
   */
  live?: 'alert' | 'status';
}

export function Notice({
  title,
  tone = 'neutral',
  children,
  details,
  actions,
  live,
}: NoticeProps) {
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={live}>
      <p className={styles.title}>{title}</p>
      {children ? <div className={styles.body}>{children}</div> : null}
      {details?.length ? (
        <ul className={styles.list}>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

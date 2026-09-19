import type { ReactNode } from 'react';
import styles from './notice.module.css';

export type NoticeTone = 'neutral' | 'alert' | 'success';

export interface NoticeProps {
  title: string;
  /**
   * Con que etiqueta se pinta el titulo.
   *
   * Por defecto es un parrafo, porque casi siempre el aviso vive dentro de una pantalla que
   * ya tiene su encabezado. Cuando el aviso ES la pantalla entera (el 404, el "no tienes
   * permiso") tiene que ser su `h1`, o esa pantalla se queda sin ningun encabezado.
   */
  titleAs?: 'p' | 'h1' | 'h2';
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
  titleAs: Title = 'p',
  tone = 'neutral',
  children,
  details,
  actions,
  live,
}: NoticeProps) {
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={live}>
      <Title className={styles.title}>{title}</Title>
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

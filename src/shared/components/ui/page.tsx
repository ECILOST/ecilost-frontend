import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './page.module.css';

/** Contenedor de pantalla: ancho, margenes y ritmo vertical comunes. */
export function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={[styles.page, className].filter(Boolean).join(' ')}>
      {children}
    </section>
  );
}

export interface PageHeaderProps {
  title: string;
  /** Rotulo pequeño encima del titulo: dice donde esta la persona. */
  eyebrow?: string;
  /** Enlace de vuelta. Es un enlace y no un `history.back()`: la vuelta debe ser predecible. */
  back?: { to: string; label: string };
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, back, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        {back ? (
          <Link className={styles.back} to={back.to}>
            <span aria-hidden="true">←</span>
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1>{title}</h1>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

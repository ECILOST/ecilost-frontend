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

/**
 * Enlace de vuelta. Es un enlace y no un `history.back()`: la vuelta debe llevar siempre al
 * mismo sitio, tanto si se llego navegando como si se abrio el enlace directo.
 */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className={styles.back} to={to}>
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}

export interface PageHeaderProps {
  title: string;
  /** Rotulo pequeño encima del titulo: dice donde esta la persona. */
  eyebrow?: string;
  back?: { to: string; label: string };
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, back, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        {back ? <BackLink to={back.to} label={back.label} /> : null}
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1>{title}</h1>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

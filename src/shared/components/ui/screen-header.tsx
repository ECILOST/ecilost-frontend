import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icon';
import styles from './screen-header.module.css';

/**
 * Barra de las pantallas de sala y ficha: flecha de vuelta, titulo, capsulas de estado y,
 * a la derecha, el contexto (ronda, objeto, sala).
 *
 * La vuelta es un enlace y no `history.back()`: tiene que llevar siempre al mismo sitio,
 * tanto si se llego navegando como si se abrio la direccion directamente.
 */
export function ScreenHeader({
  title,
  back,
  badges,
  aside,
}: {
  title: string;
  back: { to: string; label: string };
  badges?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <Link className={styles.back} to={back.to} aria-label={back.label}>
        <Icon name="arrow-left" size={20} />
      </Link>
      <h1 className={styles.title}>{title}</h1>
      {badges}
      <span className={styles.spacer} />
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
}

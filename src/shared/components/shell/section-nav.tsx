import { NavLink } from 'react-router-dom';
import type { Principal } from '@/features/auth/model/session';
import { Icon } from '../ui/icon';
import { NAV_ITEMS, type NavGroup, type NavItem } from './nav-items';
import styles from './section-nav.module.css';

/** Las entradas que esta sesion puede ver, por capacidad y no por rol. */
export function visibleNavItems(principal: Principal | null): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.requires || principal?.[item.requires]);
}

const GROUPS: NavGroup[] = ['primary', 'secondary'];

/**
 * Navegacion de secciones, en dos formas con la misma lista:
 *
 * - `bar`: en linea dentro de la cabecera de escritorio.
 * - `drawer`: vertical, con iconos, dentro del cajon del movil.
 *
 * Nunca estan las dos a la vez: el cajon solo existe mientras esta abierto, y la barra se
 * oculta con `display: none` (que tambien la saca del arbol de accesibilidad) en pantallas
 * angostas. La seccion activa lleva `aria-current="page"` (lo pone NavLink) y se marca con
 * forma y peso, no solo con color.
 */
export function SectionNav({
  variant,
  principal,
  onNavigate,
}: {
  variant: 'bar' | 'drawer';
  principal: Principal | null;
  /** Se avisa al elegir una entrada: el cajon se cierra al navegar. */
  onNavigate?: () => void;
}) {
  const items = visibleNavItems(principal);
  if (items.length === 0) return null;

  return (
    <nav className={`${styles.nav} ${styles[variant]}`} aria-label="Secciones">
      {GROUPS.map((group) => {
        const entries = items.filter((item) => item.group === group);
        if (entries.length === 0) return null;
        return (
          <ul key={group} className={`${styles.list} ${styles[group]}`}>
            {entries.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [styles.link, isActive ? styles.active : '']
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {variant === 'drawer' ? (
                    <Icon name={item.icon} size={22} />
                  ) : null}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        );
      })}
    </nav>
  );
}

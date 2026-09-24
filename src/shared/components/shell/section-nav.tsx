import { NavLink } from 'react-router-dom';
import type { Principal } from '@/features/auth/model/session';
import { Icon } from '../ui/icon';
import { NAV_ITEMS } from './nav-items';
import styles from './section-nav.module.css';

/**
 * Navegacion de secciones. Se pinta dos veces con la misma lista: como texto subrayado
 * arriba en pantallas anchas y como barra inferior en el movil. Solo una de las dos esta en
 * el DOM visible a la vez (`display: none` tambien la saca del arbol de accesibilidad), asi
 * que no hay enlaces duplicados para quien navega con lector de pantalla.
 */
export function SectionNav({
  variant,
  principal,
}: {
  variant: 'top' | 'bottom';
  principal: Principal | null;
}) {
  const items = NAV_ITEMS.filter(
    (item) => !item.requires || principal?.[item.requires],
  );

  return (
    <nav className={`${styles.nav} ${styles[variant]}`} aria-label="Secciones">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          // `aria-current="page"` lo pone react-router solo; la clase es para el estilo.
          className={({ isActive }) =>
            [styles.link, isActive ? styles.active : '']
              .filter(Boolean)
              .join(' ')
          }
        >
          {variant === 'bottom' ? <Icon name={item.icon} size={22} /> : null}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

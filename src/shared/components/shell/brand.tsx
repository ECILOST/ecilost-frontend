import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import styles from './brand.module.css';

/** La cruz girada del logotipo. Tambien sirve suelta como remate decorativo. */
export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9.6" y="1.5" width="4.8" height="21" rx="2.4" />
      <rect x="1.5" y="9.6" width="21" height="4.8" rx="2.4" />
    </svg>
  );
}

/**
 * Logotipo. Como enlace lleva al catalogo, que es la portada de la plataforma; sin enlace se
 * usa en la pantalla de entrada, donde no hay a donde ir todavia.
 */
export function Brand({
  size = 'sm',
  asLink = true,
}: {
  size?: 'sm' | 'lg';
  asLink?: boolean;
}) {
  const className = `${styles.brand} ${styles[size]}`;
  const content = (
    <>
      <span>ECI</span>
      <BrandMark size={size === 'lg' ? 34 : 18} />
      <span className={styles.lost}>LOST</span>
    </>
  );

  if (!asLink) {
    return (
      <span className={className} aria-label="ECI Lost">
        {content}
      </span>
    );
  }

  return (
    <Link
      className={className}
      to={routes.items}
      aria-label="ECI Lost, ir al catálogo"
    >
      {content}
    </Link>
  );
}

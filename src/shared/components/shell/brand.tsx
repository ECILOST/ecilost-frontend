import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import styles from './brand.module.css';

/** El rayo del logotipo. Tambien sirve suelto como glifo de "pujar". */
export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      className={styles.mark}
      width={size * 0.7}
      height={size}
      viewBox="0 0 14 20"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8.6 0 0 11.4h5.4L4.2 20 14 7.6H8.2z" />
    </svg>
  );
}

/**
 * Logotipo "ECI⚡LOST". Como enlace lleva a la portada; sin enlace se usa en la pantalla de
 * entrada, donde no hay a donde ir todavia.
 */
export function Brand({
  size = 'sm',
  asLink = true,
  to = routes.home,
}: {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  to?: string;
}) {
  const className = `${styles.brand} ${styles[size]}`;
  const content = (
    <>
      <span>ECI</span>
      <BrandMark size={size === 'lg' ? 34 : size === 'md' ? 28 : 20} />
      <span>LOST</span>
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
    <Link className={className} to={to} aria-label="ECI Lost, ir al inicio">
      {content}
    </Link>
  );
}

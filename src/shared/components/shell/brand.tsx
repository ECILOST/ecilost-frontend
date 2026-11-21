import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import styles from './brand.module.css';

/**
 * La lupa del logotipo: cristal ambar con aro y mango en tinta. El aro oscuro es lo que la
 * hace legible sobre el beige; el ambar solo, contra el fondo, apenas llega a 1.2:1.
 */
export function BrandLens({ size = 20 }: { size?: number }) {
  return (
    <svg
      className={styles.lens}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle className={styles.glass} cx="10" cy="10" r="6.6" />
      <path className={styles.shine} d="M6.9 8.6a3.6 3.6 0 0 1 2.6-2.4" />
      <path className={styles.handle} d="m15 15 5.4 5.4" />
    </svg>
  );
}

/**
 * Logotipo "ECI 🔍 LOST". Como enlace lleva a la portada; sin enlace se usa donde ya se esta
 * en ella. El nombre accesible es el de la marca: la lupa es decoracion.
 */
export function Brand({
  size = 'sm',
  asLink = true,
  to = routes.home,
  onClick,
}: {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
  to?: string;
  onClick?: () => void;
}) {
  const className = `${styles.brand} ${styles[size]}`;
  const content = (
    <>
      <span>ECI</span>
      <BrandLens size={size === 'lg' ? 40 : size === 'md' ? 32 : 24} />
      <span>LOST</span>
    </>
  );

  if (!asLink) {
    return (
      <span className={className} role="img" aria-label="ECI Lost">
        {content}
      </span>
    );
  }

  return (
    <Link
      className={className}
      to={to}
      aria-label="ECI Lost, ir al inicio"
      onClick={onClick}
    >
      {content}
    </Link>
  );
}

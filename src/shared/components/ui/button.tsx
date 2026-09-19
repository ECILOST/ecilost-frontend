import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';
export type ButtonSize = 'md' | 'lg';

/**
 * Las clases se exponen aparte del componente para que un enlace pueda verse como boton sin
 * dejar de ser un enlace. Un `<button onClick={navegar}>` pierde el ctrl+clic, el menu
 * contextual y el anuncio correcto del lector de pantalla, y todo eso para ganar un estilo.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
): string {
  return `${styles.button} ${styles[variant]} ${styles[size]}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Glifo decorativo. El texto del boton nunca se sustituye por un icono. */
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  // Por defecto `button`: un boton sin tipo dentro de un formulario lo envia sin quererlo.
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[buttonClass(variant, size), className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

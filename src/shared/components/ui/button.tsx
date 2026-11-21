import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import styles from './button.module.css';

export type ButtonVariant =
  'primary' | 'bid' | 'secondary' | 'danger' | 'quiet';
export type ButtonSize = 'md' | 'lg' | 'block';

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
  /**
   * La accion ya salio y se espera respuesta. El boton sigue enfocable (no `disabled`, que
   * le quitaria el foco a quien lo acaba de pulsar con el teclado), pero se anuncia ocupado
   * y se traga los clics siguientes: un doble clic no envia dos veces.
   */
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className,
  children,
  onClick,
  // Por defecto `button`: un boton sin tipo dentro de un formulario lo envia sin quererlo.
  type = 'button',
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      // Tambien frena el envio del formulario cuando el boton es `submit`.
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={[buttonClass(variant, size), className]
        .filter(Boolean)
        .join(' ')}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      data-loading={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

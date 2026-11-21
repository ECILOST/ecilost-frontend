import '@fontsource/roboto/latin-500.css';
import type { ButtonHTMLAttributes } from 'react';
import styles from './google-sign-in-button.module.css';

/**
 * La "G" oficial de Google, con sus cuatro colores y sus trazados tal como los publica la
 * guia de marca de Google Sign-In. No se recolorea ni se deforma: es la unica excepcion a la
 * regla de que ningun componente escribe colores sueltos.
 */
function GoogleG() {
  return (
    <svg
      className={styles.logo}
      viewBox="0 0 48 48"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export interface GoogleSignInButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Ya se salio hacia Google: el boton lo dice y no acepta otro clic. */
  loading?: boolean;
  label?: string;
}

/**
 * Boton "Continuar con Google" segun la guia de marca: fondo blanco, borde #747775, texto
 * #1F1F1F en Roboto Medium, la G a la izquierda sobre blanco. Mide al menos 44 px de alto.
 *
 * Mientras se sale hacia Google sigue enfocable pero ocupado (`aria-busy`) y se traga los
 * clics siguientes, para que un doble clic no abra dos flujos.
 */
export function GoogleSignInButton({
  loading = false,
  label = 'Continuar con Google',
  onClick,
  className,
  ...rest
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      data-loading={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      <span className={styles.icon}>
        {loading ? <span className={styles.spinner} aria-hidden="true" /> : <GoogleG />}
      </span>
      <span className={styles.label}>{loading ? 'Abriendo Google...' : label}</span>
    </button>
  );
}

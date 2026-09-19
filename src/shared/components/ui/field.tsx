import {
  createContext,
  use,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import styles from './field.module.css';

/**
 * Lo que el campo le presta a su control: el identificador con el que lo enlaza la etiqueta,
 * que textos lo describen y si esta en error.
 *
 * Va por contexto y no por propiedades para que quien escribe un formulario no tenga que
 * cablear `id`, `aria-describedby` y `aria-invalid` a mano en cada uno. Ese cableado es
 * justo lo que se olvida, y cuando se olvida el campo sigue viendose bien y deja de
 * anunciarse: el fallo no se nota mirando la pantalla.
 */
interface FieldState {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldState | null>(null);

function useField(): FieldState {
  const field = use(FieldContext);
  if (!field) {
    throw new Error('Input, Textarea y Select van dentro de <Field>');
  }
  return field;
}

export interface FieldProps {
  /** Visible siempre. Un marcador de posicion no es una etiqueta: desaparece al escribir. */
  label: string;
  /** Ayuda permanente: limites, formato, que se espera. */
  hint?: string;
  /** Mensaje de error del campo. Lo normal es que venga del `errors[]` del servicio. */
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Un campo de formulario: etiqueta, ayuda, error y control.
 *
 * La ayuda y el error van ENCIMA del control, como en el sistema de diseño del gobierno
 * britanico. Debajo se leen tarde: quien amplia la pantalla ya escribio cuando llega al
 * mensaje que le decia como escribirlo.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // El orden de esta lista es el orden en que lo lee el lector de pantalla: primero como se
  // rellena, despues que salio mal.
  const describedBy =
    [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {/*
          El asterisco es una pista visual. Que el campo es obligatorio se lo dice al lector
          de pantalla el atributo `required` del control, no este simbolo.
        */}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}

      <FieldContext
        value={{ id, describedBy, invalid: Boolean(error), required }}
      >
        {children}
      </FieldContext>
    </div>
  );
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const field = useField();

  return (
    <input
      id={field.id}
      aria-describedby={field.describedBy}
      // `undefined` y no `false`: con aria-invalid="false" escrito, algunos lectores
      // anuncian el campo como "valido", que no es lo mismo que no decir nada.
      aria-invalid={field.invalid || undefined}
      required={field.required}
      className={[styles.control, className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  rows = 5,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useField();

  return (
    <textarea
      id={field.id}
      rows={rows}
      aria-describedby={field.describedBy}
      aria-invalid={field.invalid || undefined}
      required={field.required}
      className={[styles.control, styles.textarea, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useField();

  return (
    <select
      id={field.id}
      aria-describedby={field.describedBy}
      aria-invalid={field.invalid || undefined}
      required={field.required}
      className={[styles.control, styles.select, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </select>
  );
}

/** Fila de acciones al pie de un formulario. La principal va primera en el DOM y en pantalla. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

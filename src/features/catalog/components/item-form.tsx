import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { ApiError } from '@/shared/api/problem-details';
import { Button } from '@/shared/components/ui/button';
import {
  Field,
  FormActions,
  Input,
  Select,
  Textarea,
} from '@/shared/components/ui/field';
import { Notice } from '@/shared/components/ui/notice';
import { ITEM_CONDITION_LABELS, ItemCondition } from '../domain/item-condition';
import { splitItemErrors, type ItemField } from '../domain/item-errors';
import { ITEM_LIMITS, type CreateItemRequest } from '../model/item';
import styles from './item-form.module.css';

/** Lo que el formulario sabe rellenar. La version, cuando hace falta, la lleva la pantalla. */
export type ItemFormValues = CreateItemRequest;

export const EMPTY_ITEM: ItemFormValues = {
  name: '',
  description: '',
  // Arranca en "Bueno" y no en blanco: es la condicion mas frecuente de un objeto perdido,
  // y una lista sin nada elegido obliga a decidir antes de haber leido el formulario.
  condition: ItemCondition.GOOD,
  category: '',
};

/**
 * Lo que se comprueba antes de salir a la red. Solo la ausencia: la longitud ya la corta el
 * propio control con `maxLength`, y el resto de reglas las arbitra el servicio, que es quien
 * las define.
 */
const REQUIRED: Record<'name' | 'description' | 'category', string> = {
  name: 'Escribe el nombre del objeto.',
  description: 'Describe el objeto: sin descripción nadie puede reconocerlo.',
  category: 'Indica una categoría.',
};

export interface ItemFormProps {
  initial: ItemFormValues;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  /** El fallo del ultimo envio. Cada intento trae uno nuevo, y eso recoloca el foco. */
  error: unknown;
  /** Titular del resumen cuando el fallo no es de validacion. */
  failureTitle: string;
  note?: ReactNode;
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
}

/**
 * El formulario de un objeto, compartido por el alta y la edicion.
 *
 * Es el mismo para los dos porque son los mismos cuatro campos: separarlos garantizaria que
 * algun dia el alta pida algo que la edicion no deja cambiar. Lo que cambia entre una y otra
 * (a donde se envia, que se hace al terminar) lo decide la pantalla, no esta pieza.
 *
 * Los errores, vengan del navegador o del servicio, se quedan en pantalla hasta el siguiente
 * envio y no se borran mientras se escribe. Es lo contrario de lo que apetece, pero es lo
 * predecible: un error que desaparece solo deja la duda de si se corrigio o de si el
 * formulario se rindio.
 */
export function ItemForm({
  initial,
  submitLabel,
  pendingLabel,
  pending,
  error,
  failureTitle,
  note,
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ItemField, string>>
  >({});
  /** Cuenta de envios detenidos aqui. Cambiar de valor es lo que devuelve el foco al resumen. */
  const [attempts, setAttempts] = useState(0);
  const summary = useRef<HTMLDivElement>(null);

  const problem = error instanceof ApiError ? error.problem : null;
  const server = splitItemErrors(problem?.errors);

  const blocked = Object.keys(clientErrors).length > 0;
  const fieldErrors = blocked ? clientErrors : server.byField;
  const failed = blocked || Boolean(error);

  // El foco va al resumen y no al primer campo con error: asi se oye cuantos fallaron antes
  // de aterrizar en uno, que es lo que permite decidir por donde empezar.
  useEffect(() => {
    if (error || attempts > 0) summary.current?.focus();
  }, [error, attempts]);

  function edit<K extends keyof ItemFormValues>(
    key: K,
    value: ItemFormValues[K],
  ): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmed: ItemFormValues = {
      name: values.name.trim(),
      description: values.description.trim(),
      condition: values.condition,
      category: values.category.trim(),
    };

    const missing: Partial<Record<ItemField, string>> = {};
    if (!trimmed.name) missing.name = REQUIRED.name;
    if (!trimmed.description) missing.description = REQUIRED.description;
    if (!trimmed.category) missing.category = REQUIRED.category;

    if (Object.keys(missing).length > 0) {
      setClientErrors(missing);
      setAttempts((count) => count + 1);
      return;
    }

    // Lo recortado es lo que se envia, asi que es tambien lo que debe quedar en pantalla.
    setValues(trimmed);
    setClientErrors({});
    onSubmit(trimmed);
  }

  return (
    <>
      {failed ? (
        /*
          Resumen de lo que fallo, antes del formulario. Recibe el foco pero no esta en el
          orden de tabulacion (`tabIndex={-1}`): es un destino al que se llega tras un envio
          fallido, no una parada mas del recorrido con teclado.
        */
        <div className={styles.summary} ref={summary} tabIndex={-1}>
          <Notice
            tone="alert"
            live="alert"
            title={
              blocked
                ? 'Faltan datos obligatorios'
                : (problem?.title ?? failureTitle)
            }
            details={
              blocked
                ? Object.values(clientErrors)
                : [...Object.values(server.byField), ...server.loose]
            }
          >
            {blocked
              ? 'Revisa los campos marcados y vuelve a enviar.'
              : (problem?.detail ?? 'Vuelve a intentarlo en unos segundos.')}
          </Notice>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field
          label="Nombre"
          hint="Con el que se reconoce el objeto en el catálogo."
          error={fieldErrors.name}
          required
        >
          <Input
            value={values.name}
            maxLength={ITEM_LIMITS.name}
            autoComplete="off"
            placeholder="Portátil Lenovo ThinkPad"
            onChange={(event) => edit('name', event.target.value)}
          />
        </Field>

        <Field
          label="Descripción"
          hint="Señas particulares, contenido y dónde apareció. Es lo que permite reconocerlo."
          error={fieldErrors.description}
          required
        >
          <Textarea
            value={values.description}
            maxLength={ITEM_LIMITS.description}
            placeholder="Carcasa negra con una calcomanía de la universidad en la tapa."
            onChange={(event) => edit('description', event.target.value)}
          />
        </Field>

        <div className={styles.row}>
          <Field
            label="Estado físico"
            hint="Describe el objeto, no su disponibilidad."
            error={fieldErrors.condition}
            required
          >
            <Select
              value={values.condition}
              onChange={(event) =>
                edit('condition', event.target.value as ItemCondition)
              }
            >
              {Object.values(ItemCondition).map((condition) => (
                <option key={condition} value={condition}>
                  {ITEM_CONDITION_LABELS[condition]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Categoría"
            hint="Sirve para armar rondas por tipo."
            error={fieldErrors.category}
            required
          >
            <Input
              value={values.category}
              maxLength={ITEM_LIMITS.category}
              autoComplete="off"
              placeholder="Electrónica"
              onChange={(event) => edit('category', event.target.value)}
            />
          </Field>
        </div>

        {note ? <div className={styles.note}>{note}</div> : null}

        <FormActions>
          <Button type="submit" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
          <Button variant="quiet" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
        </FormActions>
      </form>
    </>
  );
}

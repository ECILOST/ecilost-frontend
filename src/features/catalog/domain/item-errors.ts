/** Campos que el servicio puede rechazar en un alta o en una edicion. */
export const ITEM_FIELDS = [
  'name',
  'description',
  'condition',
  'category',
  'status',
  'version',
] as const;

export type ItemField = (typeof ITEM_FIELDS)[number];

export interface SplitErrors {
  /** Que decir debajo de cada casilla. */
  byField: Partial<Record<ItemField, string>>;
  /** Lo que no se pudo atribuir a ninguna. Va arriba, en el resumen. */
  loose: string[];
}

/**
 * Reparte los mensajes de validacion del servicio entre los campos del formulario.
 *
 * `errors` llega como una lista de frases y no como un mapa de campo a mensaje: es lo que
 * produce class-validator en el servicio, y lo que su criterio pide ("decir cual campo
 * falta"). Cada frase empieza por el nombre de la propiedad, asi que el reparto se hace por
 * ese prefijo.
 *
 * Es una heuristica, no un contrato, y por eso lo que no encaja con ningun campo no se tira:
 * se devuelve aparte para mostrarlo en el resumen. Un mensaje colocado en otro sitio se
 * puede leer; uno que no se pinta, no.
 */
export function splitItemErrors(
  errors: readonly string[] | undefined,
): SplitErrors {
  const byField: Partial<Record<ItemField, string>> = {};
  const loose: string[] = [];

  for (const message of errors ?? []) {
    const field = ITEM_FIELDS.find((candidate) =>
      message.startsWith(`${candidate} `),
    );

    if (!field) {
      loose.push(message);
      continue;
    }

    // Solo el primero de cada campo: el servicio manda una frase por regla incumplida, y
    // tres lineas debajo de la misma casilla no dicen mas que una.
    byField[field] ??= message;
  }

  return { byField, loose };
}

/**
 * Forma de error que entiende el cliente, tomada de RFC 9457 (Problem Details), que es la
 * que responde ecilost-catalog-service.
 *
 * Es copia deliberada de `src/common/http/problem-details.ts` del servicio: el contrato de
 * error es parte de la API, y tenerlo escrito de este lado permite ramificar por `type` sin
 * leer prosa ni comparar mensajes.
 */
export interface ProblemDetails {
  /** Identificador estable del tipo de problema. Es lo que conviene ramificar. */
  type: string;
  /** Resumen legible, constante para un mismo `type`. */
  title: string;
  status: number;
  /** Detalle de esta ocurrencia concreta. */
  detail?: string;
  /** Recurso sobre el que ocurrio. */
  instance?: string;
  /** Que campos de la peticion fallaron y por que. */
  errors?: string[];
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** Catalogo de tipos del back. Copiarlo evita que cada pantalla invente su cadena. */
export const ProblemType = {
  VALIDATION: '/problems/validacion',
  NOT_FOUND: '/problems/objeto-no-encontrado',
  VERSION_CONFLICT: '/problems/conflicto-de-version',
  INVALID_TRANSITION: '/problems/transicion-invalida',
  ITEM_IN_USE: '/problems/objeto-comprometido',
  UNSUPPORTED_MEDIA: '/problems/formato-no-soportado',
  MEDIA_TOO_LARGE: '/problems/archivo-demasiado-grande',
  VIDEO_ALREADY_EXISTS: '/problems/video-ya-existe',
  PHOTO_LIMIT_REACHED: '/problems/limite-de-fotografias',
  UNAUTHENTICATED: '/problems/sin-sesion',
  FORBIDDEN: '/problems/rol-insuficiente',
  INTERNAL: '/problems/error-interno',
} as const;

/** Lo que lanza el cliente HTTP cuando el servicio responde con un codigo de error. */
export class ApiError extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
  }

  get status(): number {
    return this.problem.status;
  }

  is(type: string): boolean {
    return this.problem.type === type;
  }
}

/**
 * Normaliza el cuerpo de error a una sola forma.
 *
 * Hace falta porque los dos servicios responden distinto y ambos tienen razon:
 * catalog es una API REST y usa RFC 9457, mientras auth es un cliente OAuth 2.0 y RFC 6749
 * le obliga a `{error, message}`. Traducir aqui deja a las pantallas con un solo formato
 * que leer, en vez de una rama por servicio.
 */
export async function toProblem(response: Response): Promise<ProblemDetails> {
  const fallback: ProblemDetails = {
    type: ProblemType.INTERNAL,
    title: response.statusText || 'Error inesperado',
    status: response.status,
  };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    // Un 502 del proxy o un HTML de error no traen JSON. No es motivo para romper el
    // manejo de errores.
    return fallback;
  }

  if (isProblemDetails(payload)) return payload;
  if (isOAuthError(payload)) {
    return {
      type: `/problems/${payload.error}`,
      title: payload.error,
      status: response.status,
      detail: payload.message,
    };
  }
  return fallback;
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === 'string' && typeof candidate.status === 'number'
  );
}

function isOAuthError(
  value: unknown,
): value is { error: string; message?: string } {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as Record<string, unknown>).error === 'string';
}

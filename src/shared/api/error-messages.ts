import { ApiError, ProblemType } from './problem-details';

/**
 * Capa unica que traduce cualquier error a un mensaje para personas.
 *
 * Todo lo que la interfaz dice cuando algo falla sale de aqui (o de `auth-error.ts`, que
 * cubre la vuelta de Google). Ningun componente arma su propio texto a partir de un codigo
 * HTTP: asi el tono es el mismo en toda la aplicacion y un codigo tecnico nunca llega a la
 * pantalla. El detalle tecnico se registra en la consola con `logTechnicalError`.
 */
export interface FriendlyError {
  title: string;
  detail: string;
  details?: string[];
}

/** Frases de estado HTTP en ingles: si llegan como titulo, son tecnicas y no se muestran. */
const REASON_PHRASE =
  /^(bad request|unauthorized|forbidden|not found|conflict|internal server error|bad gateway|service unavailable|gateway timeout|error inesperado|[a-z_]+)$/i;

/** Mensaje humano por codigo cuando el servicio no dio uno util. */
function byStatus(status: number): FriendlyError {
  if (status === 401)
    return {
      title: 'Tu sesión terminó',
      detail: 'Vuelve a iniciar sesión para continuar.',
    };
  if (status === 403)
    return {
      title: 'No tienes permiso para ver esto',
      detail: 'Si crees que es un error, pide acceso a un administrador.',
    };
  if (status === 404)
    return {
      title: 'No encontramos lo que buscabas',
      detail: 'Puede que se haya retirado o que el enlace esté incompleto.',
    };
  if (status === 408 || status === 504)
    return {
      title: 'Esto está tardando más de lo normal',
      detail: 'Vuelve a intentarlo en unos segundos.',
    };
  if (status >= 500)
    return {
      title: 'Algo salió mal de nuestro lado',
      detail: 'Tus datos están a salvo. Vuelve a intentarlo en unos segundos.',
    };
  return {
    title: 'No se pudo completar la operación',
    detail: 'Revisa los datos y vuelve a intentarlo.',
  };
}

/**
 * Capa central que traduce un error a un mensaje humano. Usa el titulo y el detalle del
 * servicio cuando son prosa para personas (los Problem Details del catalogo) y los cambia
 * por un texto propio cuando son tecnicos: errores 5xx, frases HTTP en ingles o fallos de
 * red. El detalle tecnico queda en la consola, nunca en pantalla.
 */
export function friendlyError(error: unknown): FriendlyError {
  if (error instanceof ApiError) {
    const { problem } = error;
    if (problem.status >= 500 || problem.type === ProblemType.INTERNAL) {
      return byStatus(problem.status >= 500 ? problem.status : 500);
    }
    if (!problem.title || REASON_PHRASE.test(problem.title.trim())) {
      const fallback = byStatus(problem.status);
      return {
        ...fallback,
        detail: problem.detail ?? fallback.detail,
        details: problem.errors,
      };
    }
    return {
      title: problem.title,
      detail: problem.detail ?? 'Vuelve a intentarlo en unos segundos.',
      details: problem.errors,
    };
  }

  // Sin respuesta del servicio: casi siempre es la conexion.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      title: 'Parece que no tienes conexión',
      detail: 'Revisa tu internet y vuelve a intentarlo.',
    };
  }
  return {
    title: 'No se pudo completar la operación',
    detail: 'Vuelve a intentarlo en unos segundos.',
  };
}

/** Cierto cuando el fallo es casi seguro la conexion de la persona y no el servicio. */
export function isOfflineError(error: unknown): boolean {
  return (
    !(error instanceof ApiError) &&
    typeof navigator !== 'undefined' &&
    navigator.onLine === false
  );
}

/**
 * El detalle para quien depura, fuera de la pantalla. Solo se registran los fallos que no
 * son respuestas esperables del servicio (5xx, red, errores de codigo): un 404 o una
 * validacion son parte del flujo normal y ensuciarian la consola.
 */
export function logTechnicalError(scope: string, error: unknown): void {
  if (!(error instanceof ApiError) || error.status >= 500) {
    console.error(`[${scope}]`, error);
  }
}

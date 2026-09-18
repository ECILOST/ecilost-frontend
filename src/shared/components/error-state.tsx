import { ApiError } from '@/shared/api/problem-details';
import { Button } from './ui/button';
import { Notice } from './ui/notice';

/**
 * Muestra un error del servicio con lo que el servicio dijo.
 *
 * Los servicios responden Problem Details con `title`, `detail` y, en las validaciones, la
 * lista de campos que fallaron. Reemplazarlo por un "ocurrio un error" tira justo la parte
 * que le dice a la persona que hacer.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const problem = error instanceof ApiError ? error.problem : null;

  return (
    <Notice
      tone="alert"
      live="alert"
      title={problem?.title ?? 'No se pudo completar la operación'}
      details={problem?.errors}
      actions={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null
      }
    >
      {problem?.detail ?? 'Vuelve a intentarlo en unos segundos.'}
    </Notice>
  );
}

import {
  friendlyError,
  isOfflineError,
  logTechnicalError,
} from '@/shared/api/error-messages';
import { Button } from './ui/button';
import { Notice } from './ui/notice';

/**
 * Muestra un error del servicio con un mensaje humano y una salida (Reintentar).
 *
 * Los servicios responden Problem Details con `title`, `detail` y, en las validaciones, la
 * lista de campos que fallaron; eso se conserva porque le dice a la persona que hacer. Lo
 * tecnico se traduce en `friendlyError`.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message = friendlyError(error);
  logTechnicalError('ErrorState', error);

  return (
    <Notice
      tone={isOfflineError(error) ? 'offline' : 'alert'}
      live="alert"
      title={message.title}
      details={message.details}
      actions={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null
      }
    >
      {message.detail}
    </Notice>
  );
}

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/problem-details';

/**
 * Politica de consultas comun.
 *
 * Se define una vez y no consulta por consulta para que dos pantallas no acaben tratando el
 * mismo error de forma distinta.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Un 4xx no mejora reintentando: ni la sesion vuelve sola, ni el rol cambia, ni el
         * objeto que no existe aparece. Reintentar solo retrasa el mensaje de error.
         */
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

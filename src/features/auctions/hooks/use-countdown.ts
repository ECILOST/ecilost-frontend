import { useEffect, useState } from 'react';
import { serverNow } from '@/shared/api/server-clock';

/**
 * Milisegundos que faltan hasta `target`, recalculados cada segundo.
 *
 * Cuenta con la hora del servidor (`serverNow`), no con la del navegador: sin eso, un
 * portatil con el reloj adelantado veria terminar la ronda antes que los demas.
 */
export function useCountdown(target: string | null | undefined): number {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (!target) return;
    setNow(serverNow());
    const timer = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!target) return 0;
  return Math.max(0, new Date(target).getTime() - now);
}

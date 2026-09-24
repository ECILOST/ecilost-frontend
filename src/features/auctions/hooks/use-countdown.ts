import { useEffect, useState } from 'react';

/**
 * Milisegundos que faltan hasta `target`, recalculados cada segundo.
 *
 * `serverTime` corrige el reloj local: el servicio dice que hora es para el, y la diferencia
 * con la del navegador se aplica a toda la cuenta. Sin eso, un portatil con el reloj
 * adelantado veria terminar la ronda antes que los demas.
 */
export function useCountdown(
  target: string | null | undefined,
  serverTime?: string,
): number {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (serverTime) setOffset(new Date(serverTime).getTime() - Date.now());
  }, [serverTime]);

  useEffect(() => {
    if (!target) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!target) return 0;
  return Math.max(0, new Date(target).getTime() - (now + offset));
}

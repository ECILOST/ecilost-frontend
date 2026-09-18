import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useContainer } from '@/app/providers/container-provider';
import type { Principal } from '../model/session';
import {
  SessionContext,
  type Session,
  type SessionStatus,
} from './session-context';

/**
 * Se renueva un minuto antes de que caduque el token. Quince minutos de vida no deben
 * traducirse en una pantalla que empieza a responder 401 mientras alguien la esta usando.
 */
const RENEWAL_MARGIN_SECONDS = 60;
/** Suelo del temporizador, por si algun entorno configura un token muy corto. */
const MIN_RENEWAL_SECONDS = 30;

/**
 * Gobierna la sesion: canjea la cookie por un access token al arrancar, lo guarda en
 * memoria, lo renueva antes de que caduque y lo tira cuando deja de valer.
 *
 * Es la contraparte de `JwtAuthGuard` en el servidor: nadie mas lee ni escribe el token.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth, tokens, sessionLost } = useContainer();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const renewal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clear = useCallback(() => {
    clearTimeout(renewal.current);
    tokens.set(null);
    setPrincipal(null);
    setStatus('anonymous');
  }, [tokens]);

  const renew = useCallback(async () => {
    try {
      const token = await auth.exchangeSession();
      tokens.set(token.access_token);
      setPrincipal(await auth.me());
      setStatus('authenticated');

      clearTimeout(renewal.current);
      renewal.current = setTimeout(
        () => void renew(),
        Math.max(
          token.expires_in - RENEWAL_MARGIN_SECONDS,
          MIN_RENEWAL_SECONDS,
        ) * 1000,
      );
    } catch {
      // Sin cookie, con la cookie caducada o con la cuenta suspendida el servicio responde
      // 401, y para la interfaz los tres casos significan lo mismo: no hay sesion.
      clear();
    }
  }, [auth, tokens, clear]);

  // Al montar. En desarrollo StrictMode lo ejecuta dos veces, pero el adaptador comparte el
  // canje en vuelo: sale una sola peticion y la cadena de refresh no se revoca.
  useEffect(() => {
    void renew();
    return () => clearTimeout(renewal.current);
  }, [renew]);

  // Un 401 de cualquier servicio, no solo de auth, cierra la sesion aqui.
  useEffect(() => sessionLost.subscribe(clear), [sessionLost, clear]);

  const value = useMemo<Session>(
    () => ({
      status,
      principal,
      login: () => window.location.assign(auth.loginUrl()),
      logout: async () => {
        try {
          await auth.logout();
        } finally {
          // Aunque el servicio falle, la sesion local se va: dejarla puesta mostraria un
          // menu de alguien que ya pidio salir.
          clear();
        }
      },
    }),
    [status, principal, auth, clear],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

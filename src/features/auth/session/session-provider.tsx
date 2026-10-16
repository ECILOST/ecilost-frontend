import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
/** Tras recuperar la sesion por un 401, otro 401 en este plazo ya no se atribuye al token. */
const RECOVERY_COOLDOWN_MS = 30_000;

/**
 * Gobierna la sesion: canjea la cookie por un access token al arrancar, lo guarda en
 * memoria, lo renueva antes de que caduque y lo tira cuando deja de valer.
 *
 * Es la contraparte de `JwtAuthGuard` en el servidor: nadie mas lee ni escribe el token.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth, tokens, sessionLost } = useContainer();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const renewal = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Cuando caduca el access token vigente; `null` sin sesion. */
  const expiresAt = useRef<number | null>(null);
  const recovering = useRef(false);
  const lastRecovery = useRef(0);

  const clear = useCallback(() => {
    clearTimeout(renewal.current);
    expiresAt.current = null;
    tokens.set(null);
    setPrincipal(null);
    setStatus('anonymous');
  }, [tokens]);

  const renew = useCallback(async () => {
    try {
      const token = await auth.exchangeSession();
      tokens.set(token.access_token);
      expiresAt.current = Date.now() + token.expires_in * 1000;
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

  /**
   * Un 401 de cualquier servicio no cierra la sesion de entrada: casi siempre es el access
   * token vencido porque el temporizador no llego a tiempo (portatil suspendido, pestaña en
   * segundo plano, que el navegador frena), y la cookie de sesion sigue valiendo dias. Se
   * intenta un canje; si tambien falla, `renew` la cierra. Lo que fallo por el token viejo
   * se vuelve a pedir con el nuevo.
   */
  const recover = useCallback(async () => {
    if (recovering.current) return;
    // Recien recuperada, un 401 es una peticion que ya iba con el token viejo, o un fallo
    // que otro canje no arregla (rol, emisor). En ningun caso se canjea de nuevo: entraria
    // en bucle con la relectura de las consultas.
    if (Date.now() - lastRecovery.current < RECOVERY_COOLDOWN_MS) return;
    recovering.current = true;
    try {
      await renew();
      if (tokens.get()) {
        lastRecovery.current = Date.now();
        void queryClient.invalidateQueries();
      }
    } finally {
      recovering.current = false;
    }
  }, [renew, tokens, queryClient]);

  useEffect(() => sessionLost.subscribe(() => void recover()), [sessionLost, recover]);

  // Al volver a la pestaña tras una suspension, el token pudo vencer sin que corriera el
  // temporizador: se renueva antes de que la pantalla pida nada con el.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || expiresAt.current === null) return;
      if (Date.now() >= expiresAt.current - RENEWAL_MARGIN_SECONDS * 1000) void recover();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [recover]);

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

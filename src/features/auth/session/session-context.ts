import { createContext } from 'react';
import type { Principal } from '../model/session';

/**
 * `loading` es un estado propio y no "todavia no hay principal": al arrancar no se sabe si
 * hay sesion hasta que la cookie se canjea, y sin distinguirlo los guards mandarian a
 * /login a alguien que si tenia sesion.
 */
export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface Session {
  status: SessionStatus;
  /** Quien es y que puede hacer. Null mientras no haya sesion confirmada. */
  principal: Principal | null;
  /** Manda a Google. Navegacion completa: la aplicacion se descarta y vuelve despues. */
  login: () => void;
  logout: () => Promise<void>;
}

/** El contexto vive aparte del componente para no romper el refresco en caliente. */
export const SessionContext = createContext<Session | null>(null);

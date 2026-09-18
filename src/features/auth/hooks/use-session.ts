import { use } from 'react';
import { SessionContext, type Session } from '../session/session-context';

/** Unica puerta a la sesion. Nadie lee el contexto directamente. */
export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) {
    throw new Error('useSession se uso fuera de <SessionProvider>');
  }
  return session;
}

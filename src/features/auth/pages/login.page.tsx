import { Navigate, useLocation } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Loading } from '@/shared/components/loading';
import { Brand } from '@/shared/components/shell/brand';
import { Backdrop } from '@/shared/components/ui/backdrop';
import { Button } from '@/shared/components/ui/button';
import { useSession } from '../hooks/use-session';
import styles from './login.page.module.css';

/**
 * Entrada de la aplicacion.
 *
 * El boton no envia un formulario: manda el navegador a `GET /auth/google`, que responde un
 * 302 hacia Google. Un `fetch` se comeria la redireccion y nadie saldria de la pagina.
 * Aqui no hay campos de usuario ni contraseña: las credenciales las pide Google, nunca
 * ECILOST, y conviene que se vea.
 */
export function LoginPage() {
  const { status, login } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className={styles.login}>
        <Backdrop variant="splash" />
        <Brand size="lg" asLink={false} />
        <Loading label="Comprobando la sesión..." />
      </div>
    );
  }

  // Con sesion no hay nada que hacer en /login. `from` lo deja el guard al redirigir.
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? routes.items} replace />;
  }

  return (
    <div className={styles.login}>
      <Backdrop variant="splash" />

      <Brand size="lg" asLink={false} />

      <p className={styles.tagline}>
        Objetos perdidos,
        <br />
        <span className={styles.taglineAccent}>nuevas historias.</span>
      </p>

      <p className={styles.lead}>
        Lo que la universidad no pudo devolver sale a subasta. Explora el
        catálogo, entra a una sala y puja con ECICoin.
      </p>

      <Button size="lg" onClick={login}>
        Entrar con Google
      </Button>

      <p className={styles.note}>
        Usa tu cuenta institucional. La contraseña la pide Google: ECILOST nunca
        la ve.
      </p>
    </div>
  );
}

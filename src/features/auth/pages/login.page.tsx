import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Loading } from '@/shared/components/loading';
import { Brand } from '@/shared/components/shell/brand';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Notice } from '@/shared/components/ui/notice';
import { useOnline } from '@/shared/hooks/use-online';
import { GoogleSignInButton } from '../components/google-sign-in-button';
import { INSTITUTIONAL_DOMAINS, resolveLoginError } from '../domain/auth-error';
import { useSession } from '../hooks/use-session';
import styles from './login.page.module.css';

/**
 * Entrada de la aplicacion.
 *
 * La cuenta es la de Google: el boton manda el navegador a `GET /auth/google`, que responde
 * un 302 hacia Google. ECI Lost nunca ve ni guarda contraseñas, y conviene que se vea: por
 * eso la tarjeta no tiene campos.
 *
 * Tambien es la pantalla a la que el servicio devuelve a quien rechaza, con el motivo en la
 * direccion. Todo motivo pasa por `resolveLoginError`, que es quien decide el texto: aqui no
 * se escribe ningun mensaje de error suelto.
 */
export function LoginPage() {
  const { status, login, expired } = useSession();
  const location = useLocation();
  const [params] = useSearchParams();
  const online = useOnline();
  const code = params.get('error');
  const error = resolveLoginError({ code, online, sessionExpired: expired });

  /** Se sale de la pagina: solo hay que evitar que el boton parezca muerto mientras tanto. */
  const [leaving, setLeaving] = useState(false);

  // Volver atras desde Google restaura esta pagina con el boton ocupado. `pageshow` es el
  // unico aviso de que la pagina se resucito de la cache.
  useEffect(() => {
    const revive = () => setLeaving(false);
    window.addEventListener('pageshow', revive);
    return () => window.removeEventListener('pageshow', revive);
  }, []);

  // El codigo tecnico es para quien depura, no para quien intenta entrar.
  useEffect(() => {
    if (code) console.warn('[auth] el servicio rechazo el inicio de sesion:', code);
  }, [code]);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? routes.home} replace />;
  }

  const start = () => {
    if (leaving) return;
    // Sin red, mandar a Google solo cambiaria este aviso por la pagina de error del navegador.
    if (!navigator.onLine) return;
    setLeaving(true);
    login();
  };

  return (
    <div className={styles.screen}>
      <div className={styles.decor} aria-hidden="true">
        <span className={`${styles.blob} ${styles.violet}`} />
        <span className={`${styles.blob} ${styles.teal}`} />
        <span className={`${styles.blob} ${styles.pink}`} />
        <span className={`${styles.blob} ${styles.yellow}`} />
      </div>

      <header className={styles.top}>
        <Link className={styles.back} to={routes.home}>
          <Icon name="arrow-left" size={18} />
          Volver al inicio
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="login-title">
          <Brand size="md" asLink={false} />

          {status === 'loading' ? (
            <Loading label="Comprobando la sesión..." />
          ) : (
            <>
              <div className={styles.heading}>
                <h1 id="login-title" className={styles.title}>
                  Ingresa con tu cuenta de la Escuela
                </h1>
                <p className={styles.hint}>
                  Usa tu correo institucional{' '}
                  <span className={styles.domain}>@{INSTITUTIONAL_DOMAINS[0]}</span> o{' '}
                  <span className={styles.domain}>@{INSTITUTIONAL_DOMAINS[1]}</span>.
                  La contraseña la pide Google: ECI Lost nunca la ve.
                </p>
              </div>

              {/*
                Va delante del boton: quien llega aqui rebotado necesita leer por que antes de
                volver a intentarlo. `role="alert"` lo anuncia al aparecer, tambien cuando se
                corta la conexion con la pagina abierta.
              */}
              {error ? (
                <Notice
                  tone="alert"
                  live="alert"
                  title={error.title}
                  actions={
                    <Button
                      variant="secondary"
                      loading={leaving}
                      disabled={!online}
                      onClick={start}
                    >
                      {error.retryLabel}
                    </Button>
                  }
                >
                  <p>{error.message}</p>
                  {error.hint ? <p className={styles.errorHint}>{error.hint}</p> : null}
                  {!online ? (
                    <p className={styles.errorHint}>
                      El botón se activará solo cuando vuelva la conexión.
                    </p>
                  ) : null}
                </Notice>
              ) : null}

              <GoogleSignInButton
                loading={leaving}
                disabled={!online}
                onClick={start}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

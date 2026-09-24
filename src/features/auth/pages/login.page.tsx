import { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Loading } from '@/shared/components/loading';
import { Brand } from '@/shared/components/shell/brand';
import { Button } from '@/shared/components/ui/button';
import { Notice } from '@/shared/components/ui/notice';
import { loginErrorMessage } from '../domain/auth-error';
import { useSession } from '../hooks/use-session';
import styles from './login.page.module.css';

/**
 * Entrada de la aplicacion, con el diseño de "Escritorio · Acceso".
 *
 * El diseño dibuja correo y contraseña, pero la cuenta es la institucional de Google: el
 * boton manda el navegador a `GET /auth/google`, que responde un 302 hacia Google. ECILOST
 * nunca ve ni guarda contraseñas, y conviene que se vea: por eso la tarjeta no tiene campos.
 *
 * Tambien es la pantalla a la que el servicio devuelve a quien rechaza, con el motivo en la
 * direccion. Sin leerlo, una cuenta inactiva reintentaria en bucle sin saber por que.
 */
export function LoginPage() {
  const { status, login } = useSession();
  const location = useLocation();
  const [params] = useSearchParams();
  const error = loginErrorMessage(params.get('error'));

  /** Se sale de la pagina: solo hay que evitar que el boton parezca muerto mientras tanto. */
  const [leaving, setLeaving] = useState(false);

  // Volver atras desde Google restaura esta pagina con el boton deshabilitado. `pageshow`
  // es el unico aviso de que la pagina se resucito de la cache.
  useEffect(() => {
    const revive = () => setLeaving(false);
    window.addEventListener('pageshow', revive);
    return () => window.removeEventListener('pageshow', revive);
  }, []);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? routes.home} replace />;
  }

  return (
    <div className={styles.screen}>
      <span className={`${styles.blob} ${styles.blue}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.cyan}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.pink}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.yellow}`} aria-hidden="true" />
      <span className={styles.fade} aria-hidden="true" />

      <div className={styles.layout}>
        <section className={styles.intro}>
          <Brand size="md" asLink={false} />
          <h1 className={styles.tagline}>
            Objetos perdidos,
            <br />
            nuevas historias
          </h1>
          <p className={styles.lead}>
            Descubre, puja y llévatelos. Las subastas de objetos perdidos de tu
            universidad, en vivo y con ECICoin.
          </p>
          <dl className={styles.stats}>
            <div>
              <dt>objetos recuperados</dt>
              <dd className={styles.yellowText}>1.240</dd>
            </div>
            <div>
              <dt>salas al mes</dt>
              <dd className={styles.cyanText}>38</dd>
            </div>
            <div>
              <dt>estudiantes activos</dt>
              <dd className={styles.pinkText}>4.5k</dd>
            </div>
          </dl>
        </section>

        <section className={styles.panel}>
          <div className={styles.card}>
            {status === 'loading' ? (
              <Loading label="Comprobando la sesión..." />
            ) : (
              <>
                <h2 className={styles.cardTitle}>
                  Entra con tu correo institucional
                </h2>

                {/*
                  Va delante del boton: quien llega aqui rebotado necesita leer por que antes
                  de volver a intentarlo.
                */}
                {error ? (
                  <Notice
                    tone="alert"
                    live="alert"
                    title="No pudimos iniciar tu sesión"
                  >
                    {error}
                  </Notice>
                ) : null}

                <p className={styles.hint}>
                  Usa tu cuenta <strong>@escuelaing.edu.co</strong>. La
                  contraseña la pide Google: ECILOST nunca la ve.
                </p>

                <Button
                  size="block"
                  disabled={leaving}
                  onClick={() => {
                    setLeaving(true);
                    login();
                  }}
                >
                  {leaving
                    ? 'Abriendo Google...'
                    : error
                      ? 'Volver a intentarlo'
                      : 'Entrar con Google'}
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

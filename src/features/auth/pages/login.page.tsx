import { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Loading } from '@/shared/components/loading';
import { Brand, BrandMark } from '@/shared/components/shell/brand';
import { Backdrop } from '@/shared/components/ui/backdrop';
import { BlobFrame } from '@/shared/components/ui/blob-frame';
import { Button } from '@/shared/components/ui/button';
import { Notice } from '@/shared/components/ui/notice';
import { loginErrorMessage } from '../domain/auth-error';
import { useSession } from '../hooks/use-session';
import styles from './login.page.module.css';

/**
 * Entrada de la aplicacion.
 *
 * El boton no envia un formulario: manda el navegador a `GET /auth/google`, que responde un
 * 302 hacia Google. Un `fetch` se comeria la redireccion y nadie saldria de la pagina.
 * Aqui no hay campos de usuario ni contraseña: las credenciales las pide Google, nunca
 * ECILOST, y conviene que se vea.
 *
 * Tambien es la pantalla a la que el servicio devuelve a quien rechaza, con el motivo en la
 * direccion. Sin leerlo, una cuenta inactiva o un correo sin verificar reintentarian en
 * bucle contra la misma portada de bienvenida, sin enterarse de que el problema no es suyo.
 */
export function LoginPage() {
  const { status, login } = useSession();
  const location = useLocation();
  const [params] = useSearchParams();
  const error = loginErrorMessage(params.get('error'));

  /**
   * Se sale de la pagina, no se envia nada, asi que lo unico que hay que evitar es que el
   * boton parezca muerto mientras el navegador negocia con Google.
   */
  const [leaving, setLeaving] = useState(false);

  // Volver atras desde Google restaura esta pagina tal como estaba, con el boton todavia
  // deshabilitado. `pageshow` es el unico aviso de que la pagina se resucito de la cache.
  useEffect(() => {
    const revive = () => setLeaving(false);
    window.addEventListener('pageshow', revive);
    return () => window.removeEventListener('pageshow', revive);
  }, []);

  if (status === 'loading') {
    return (
      <div className={styles.screen}>
        <Backdrop variant="splash" />
        <div className={styles.login}>
          <Brand size="lg" asLink={false} />
          <Loading label="Comprobando la sesión..." />
        </div>
      </div>
    );
  }

  // Con sesion no hay nada que hacer en /login. `from` lo deja el guard al redirigir.
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? routes.items} replace />;
  }

  return (
    <div className={styles.screen}>
      <Backdrop variant="splash" />

      <div className={styles.login}>
        <Brand size="lg" asLink={false} />

        {/*
          Va delante de todo lo demas y no al lado del boton: quien llega aqui rebotado
          necesita leer por que antes de volver a intentarlo, y quien usa lector de pantalla
          empieza por el principio del documento.
        */}
        {error ? (
          <div className={styles.error}>
            <Notice
              tone="alert"
              live="alert"
              title="No pudimos iniciar tu sesión"
            >
              {error}
            </Notice>
          </div>
        ) : null}

        <p className={styles.tagline}>
          Objetos perdidos,
          <br />
          nuevas historias
        </p>

        <BlobFrame
          className={styles.art}
          size="lg"
          palette={2}
          shape="b"
          fallback={<BrandMark size={72} />}
        />

        <p className={styles.lead}>
          Lo que la universidad no pudo devolver sale a subasta. Explora el
          catálogo, entra a una sala y puja con ECICoin.
        </p>

        <Button
          size="lg"
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

        <p className={styles.note}>
          Usa tu cuenta institucional. La contraseña la pide Google: ECILOST
          nunca la ve.
        </p>
      </div>
    </div>
  );
}

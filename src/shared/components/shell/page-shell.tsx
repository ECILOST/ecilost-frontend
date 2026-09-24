import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { routes } from '@/app/routes';
import { NotificationBell } from '@/features/auctions/components/notification-bell';
import { Account } from '@/features/auth/components/account';
import { useSession } from '@/features/auth/hooks/use-session';
import { EcicoinBalance } from '@/features/wallet/components/ecicoin-balance';
import { Brand } from './brand';
import { SectionNav } from './section-nav';
import styles from './page-shell.module.css';

/** Destino del enlace de salto y del foco al cambiar de pantalla. */
const MAIN_ID = 'contenido';

/**
 * Marco comun de las pantallas con sesion: marca, secciones, saldo, campana y cuenta.
 *
 * El menu se arma con las banderas de `GET /auth/me` y no con el rol: el servicio las
 * publica justamente para eso. Ocultar una entrada no autoriza nada: cada servicio sigue
 * comprobando el rol en su endpoint.
 *
 * `focus` quita las secciones: las pantallas de sala y de ficha traen su propia barra con
 * la flecha de vuelta, como en el diseño, y la navegacion general no compite con la puja.
 */
export function PageShell({ focus = false }: { focus?: boolean }) {
  const { principal } = useSession();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  /*
   * Al cambiar de pantalla, el foco va al contenido. En una aplicacion de una sola pagina no
   * hay carga de documento, asi que sin esto quien navega con lector de pantalla se queda
   * oyendo la pagina anterior.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    main.current?.focus();
  }, [pathname]);

  const canBid = principal?.canBid === true;

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href={`#${MAIN_ID}`}>
        Saltar al contenido
      </a>

      {focus ? null : (
        <header className={styles.header}>
          <Brand to={canBid ? routes.home : routes.items} />
          <SectionNav variant="top" principal={principal} />
          <div className={styles.tools}>
            <EcicoinBalance />
            {canBid ? <NotificationBell /> : null}
            <Account />
          </div>
        </header>
      )}

      {/* `tabIndex={-1}` para poder recibir el foco sin entrar en el orden de tabulacion. */}
      <main className={styles.main} id={MAIN_ID} ref={main} tabIndex={-1}>
        <Outlet />
      </main>

      {focus ? null : <SectionNav variant="bottom" principal={principal} />}
    </div>
  );
}

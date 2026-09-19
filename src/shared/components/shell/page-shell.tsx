import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Account } from '@/features/auth/components/account';
import { useSession } from '@/features/auth/hooks/use-session';
import { Backdrop } from '../ui/backdrop';
import { Brand } from './brand';
import { SectionNav } from './section-nav';
import styles from './page-shell.module.css';

/** Destino del enlace de salto y del foco al cambiar de pantalla. */
const MAIN_ID = 'contenido';

/**
 * Marco comun de las pantallas con sesion.
 *
 * El menu se arma con las banderas de `GET /auth/me` y no con el rol: el servicio las
 * publica justamente para eso, y asi el dia que un rol nuevo pueda administrar el catalogo
 * no hay que tocar esta lista. Ocultar una entrada no autoriza nada: cada servicio sigue
 * comprobando el rol en su endpoint.
 */
export function PageShell() {
  const { principal } = useSession();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  /*
   * Al cambiar de pantalla, el foco va al contenido.
   *
   * En una aplicacion de una sola pagina no hay carga de documento, asi que sin esto quien
   * navega con lector de pantalla se queda oyendo la pagina anterior: el enlace que pulso
   * desaparecio, pero el foco sigue donde estaba. No se hace en el primer montaje, que es
   * cuando el navegador ya empieza por el principio del documento.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    main.current?.focus();
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <Backdrop />

      {/*
        Enlace de salto: invisible hasta que recibe el foco, y entonces es lo primero que se
        alcanza con el tabulador. Sin el, llegar al contenido desde el teclado obliga a
        recorrer la marca y todas las secciones en cada pantalla.
      */}
      <a className={styles.skip} href={`#${MAIN_ID}`}>
        Saltar al contenido
      </a>

      <header className={styles.header}>
        <Brand />
        <SectionNav variant="top" principal={principal} />
        <Account />
      </header>

      {/* `tabIndex={-1}` para poder recibir el foco sin entrar en el orden de tabulacion. */}
      <main className={styles.main} id={MAIN_ID} ref={main} tabIndex={-1}>
        <Outlet />
      </main>

      <SectionNav variant="bottom" principal={principal} />
    </div>
  );
}

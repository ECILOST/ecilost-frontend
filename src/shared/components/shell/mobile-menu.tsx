import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { routes } from '@/app/routes';
import {
  AccountIdentity,
  LogoutButton,
} from '@/features/auth/components/account';
import { useSession } from '@/features/auth/hooks/use-session';
import { EcicoinBalance } from '@/features/wallet/components/ecicoin-balance';
import { Icon } from '../ui/icon';
import { Brand } from './brand';
import { SectionNav } from './section-nav';
import styles from './mobile-menu.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Menu del movil: boton de hamburguesa y cajon lateral con las secciones, el saldo y la
 * cuenta. Sustituye a la barra inferior, que tapaba contenido y no cabia en 320 px con cinco
 * entradas.
 *
 * Es un dialogo modal hecho a mano, como `Dialog`, porque jsdom no implementa `showModal()`:
 * - Se cierra con Escape, tocando el velo, con su boton y al navegar.
 * - Atrapa el foco mientras esta abierto; al abrir lo pone en el cajon y al cerrar lo
 *   devuelve al boton (salvo al navegar: entonces el marco lo lleva al contenido nuevo).
 * - Bloquea el scroll del documento para que no se desplace la pagina de detras.
 */
export function MobileMenu() {
  const { principal } = useSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const titleId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  }, []);

  /*
   * Al elegir una entrada el cajon se cierra sin devolver el foco al boton: si la direccion
   * cambia, el marco lo pone en el contenido. Si era la misma pantalla no hay cambio de
   * direccion, y entonces si vuelve al boton para no dejarlo perdido en el documento.
   */
  const closeOnNavigate = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        button.current?.focus();
      }
    });
  }, []);

  // Cerrar al cambiar de direccion (atras/adelante del navegador incluido).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!panel.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = previousOverflow;
    };
  }, [open, close]);

  if (!principal) return null;

  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={24} />
      </button>

      {createPortal(
        <div className={styles.layer} hidden={!open}>
          <div
            className={styles.scrim}
            aria-hidden="true"
            onClick={() => close()}
          />
          <div
            ref={panel}
            id={drawerId}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            <h2 id={titleId} className="u-sr-only">
              Menú
            </h2>
            <div className={styles.head}>
              <Brand
                to={principal.canBid ? routes.home : routes.items}
                onClick={closeOnNavigate}
              />
              <button
                type="button"
                className={styles.close}
                aria-label="Cerrar menú"
                onClick={() => close()}
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            {open ? (
              <>
                <div className={styles.account}>
                  <AccountIdentity withAvatar />
                  <EcicoinBalance />
                </div>

                <SectionNav
                  variant="drawer"
                  principal={principal}
                  onNavigate={closeOnNavigate}
                />

                <div className={styles.foot}>
                  {principal.canBid ? (
                    <Link
                      className={styles.footLink}
                      to={routes.profile}
                      onClick={closeOnNavigate}
                    >
                      <Icon name="medal" size={20} />
                      Mi perfil y medallas
                    </Link>
                  ) : null}
                  <LogoutButton />
                </div>
              </>
            ) : null}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

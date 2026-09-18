import { Outlet } from 'react-router-dom';
import { ROLE_LABELS } from '@/features/auth/domain/role';
import { useSession } from '@/features/auth/hooks/use-session';
import { Backdrop } from '../ui/backdrop';
import { Button } from '../ui/button';
import { Pill } from '../ui/pill';
import { Brand } from './brand';
import { SectionNav } from './section-nav';
import styles from './page-shell.module.css';

/**
 * Marco comun de las pantallas con sesion.
 *
 * El menu se arma con las banderas de `GET /auth/me` y no con el rol: el servicio las
 * publica justamente para eso, y asi el dia que un rol nuevo pueda administrar el catalogo
 * no hay que tocar esta lista. Ocultar una entrada no autoriza nada: cada servicio sigue
 * comprobando el rol en su endpoint.
 */
export function PageShell() {
  const { principal, logout } = useSession();

  return (
    <div className={styles.shell}>
      <Backdrop />

      <header className={styles.header}>
        <Brand />
        <SectionNav variant="top" principal={principal} />

        {principal ? (
          <div className={styles.session}>
            <Pill tone="mint" dot>
              {ROLE_LABELS[principal.role]}
            </Pill>
            <Button variant="quiet" onClick={() => void logout()}>
              Salir
            </Button>
          </div>
        ) : null}
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <SectionNav variant="bottom" principal={principal} />
    </div>
  );
}

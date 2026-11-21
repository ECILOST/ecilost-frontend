import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Icon } from '@/shared/components/ui/icon';
import { Button } from '@/shared/components/ui/button';
import { Pill } from '@/shared/components/ui/pill';
import { ROLE_LABELS } from '../domain/role';
import { useProfile } from '../hooks/use-profile';
import { useSession } from '../hooks/use-session';
import styles from './account.module.css';

/**
 * El circulo de la cuenta. El avatar de Google caduca y puede dejar de servirse, asi que
 * siempre hay respaldo: la inicial sobre el degradado. Mide igual con foto o sin ella, para
 * que la cabecera no salte cuando el perfil termina de llegar.
 */
export function AccountAvatar({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { principal } = useSession();
  const { data: profile } = useProfile();
  const [brokenAvatar, setBrokenAvatar] = useState(false);
  if (!principal) return null;

  const name = profile?.fullName ?? '';
  const initial = (name || ROLE_LABELS[principal.role]).charAt(0).toUpperCase();
  const className = `${styles.avatar} ${styles[size]}`;

  return profile?.avatarUrl && !brokenAvatar ? (
    <img
      className={className}
      src={profile.avatarUrl}
      alt=""
      onError={() => setBrokenAvatar(true)}
    />
  ) : (
    <span className={className} aria-hidden="true">
      {initial}
    </span>
  );
}

/**
 * Nombre, correo y rol. En un ordenador compartido hay que poder comprobar en que cuenta se
 * esta trabajando antes de pujar.
 */
export function AccountIdentity({ withAvatar = false }: { withAvatar?: boolean }) {
  const { principal } = useSession();
  const { data: profile } = useProfile();
  if (!principal) return null;

  return (
    <div className={styles.identity}>
      {withAvatar ? <AccountAvatar size="lg" /> : null}
      <div className={styles.who}>
        {profile?.fullName ? (
          <span className={styles.name}>{profile.fullName}</span>
        ) : null}
        {profile?.email ? (
          <span className={styles.email}>{profile.email}</span>
        ) : null}
        <Pill tone="cyan" dot>
          {ROLE_LABELS[principal.role]}
        </Pill>
      </div>
    </div>
  );
}

/**
 * Cerrar sesion, con espera visible. El servicio puede tardar en revocar; mientras tanto el
 * boton dice que esta saliendo y no acepta un segundo clic.
 */
export function LogoutButton() {
  const { logout } = useSession();
  const [leaving, setLeaving] = useState(false);

  return (
    <Button
      variant="quiet"
      icon={<Icon name="logout" size={18} />}
      loading={leaving}
      onClick={() => {
        setLeaving(true);
        void logout().finally(() => setLeaving(false));
      }}
    >
      {leaving ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </Button>
  );
}

/**
 * Menu de la cuenta en la cabecera de escritorio: avatar y, al pulsarlo, quien esta dentro,
 * su perfil y la salida. Se cierra con Escape (devolviendo el foco al avatar) o al hacer
 * clic fuera.
 */
export function Account() {
  const { principal } = useSession();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!principal) return null;
  const name = profile?.fullName ?? '';

  return (
    <div className={styles.account} ref={root}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={name ? `Cuenta de ${name}` : 'Cuenta'}
        onClick={() => setOpen((value) => !value)}
      >
        <AccountAvatar />
      </button>

      {open ? (
        <div className={styles.menu} id={menuId}>
          <AccountIdentity />
          {principal.canBid ? (
            <Link
              className={styles.profileLink}
              to={routes.profile}
              onClick={() => setOpen(false)}
            >
              <Icon name="medal" size={18} />
              Mi perfil y medallas
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      ) : null}
    </div>
  );
}

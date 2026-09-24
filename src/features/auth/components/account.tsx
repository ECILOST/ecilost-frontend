import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Pill } from '@/shared/components/ui/pill';
import { ROLE_LABELS } from '../domain/role';
import { useProfile } from '../hooks/use-profile';
import { useSession } from '../hooks/use-session';
import styles from './account.module.css';

/**
 * Quien esta dentro: el avatar de la cabecera y, al pulsarlo, nombre, rol y salida.
 *
 * El diseño deja en la cabecera solo el circulo; el nombre sigue a un clic porque en un
 * ordenador compartido hay que poder comprobar en que cuenta se esta trabajando.
 *
 * El avatar de Google caduca y puede dejar de servirse, asi que siempre hay respaldo: la
 * inicial sobre el degradado del diseño.
 */
export function Account() {
  const { principal, logout } = useSession();
  const { data: profile } = useProfile();
  const [brokenAvatar, setBrokenAvatar] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !root.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!principal) return null;

  const name = profile?.fullName ?? '';
  const initial = (name || ROLE_LABELS[principal.role]).charAt(0).toUpperCase();
  const showAvatar = Boolean(profile?.avatarUrl) && !brokenAvatar;

  return (
    <div className={styles.account} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={name ? `Cuenta de ${name}` : 'Cuenta'}
        onClick={() => setOpen((value) => !value)}
      >
        {showAvatar ? (
          <img
            className={styles.avatar}
            src={profile?.avatarUrl ?? undefined}
            alt=""
            onError={() => setBrokenAvatar(true)}
          />
        ) : (
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
        )}
      </button>

      {open ? (
        <div className={styles.menu} id={menuId}>
          {name ? <span className={styles.name}>{name}</span> : null}
          {profile?.email ? (
            <span className={styles.email}>{profile.email}</span>
          ) : null}
          <Pill tone="cyan" dot>
            {ROLE_LABELS[principal.role]}
          </Pill>
          <Button variant="quiet" onClick={() => void logout()}>
            Salir
          </Button>
        </div>
      ) : null}
    </div>
  );
}

import { useState } from 'react';
import { EcicoinBalance } from '@/features/wallet/components/ecicoin-balance';
import { Button } from '@/shared/components/ui/button';
import { Pill } from '@/shared/components/ui/pill';
import { ROLE_LABELS } from '../domain/role';
import { useProfile } from '../hooks/use-profile';
import { useSession } from '../hooks/use-session';
import styles from './account.module.css';

/**
 * Quien esta dentro, en la cabecera.
 *
 * Enseña a la persona y no solo su rol: "Funcionario" describe un permiso, no dice en que
 * cuenta se esta trabajando, que es justo lo que hay que poder comprobar de un vistazo en un
 * ordenador compartido.
 *
 * El avatar de Google caduca y puede dejar de servirse, asi que siempre hay respaldo: la
 * inicial sobre color. No es un caso raro que haya que tratar algun dia, es el motivo por el
 * que el modelo declara `avatarUrl` como anulable.
 */
export function Account() {
  const { principal, logout } = useSession();
  const { data: profile } = useProfile();
  const [brokenAvatar, setBrokenAvatar] = useState(false);

  if (!principal) return null;

  const name = profile?.fullName ?? '';
  const initial = (name || ROLE_LABELS[principal.role]).charAt(0).toUpperCase();
  const showAvatar = Boolean(profile?.avatarUrl) && !brokenAvatar;

  return (
    <div className={styles.account}>
      <span className={styles.identity}>
        {showAvatar ? (
          <img
            className={styles.avatar}
            src={profile?.avatarUrl ?? undefined}
            alt=""
            // Decorativo: el nombre ya esta al lado en texto, y para quien no lo ve la
            // fotografia no añade nada.
            onError={() => setBrokenAvatar(true)}
          />
        ) : (
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
        )}

        {/* El nombre se esconde en pantallas estrechas; el avatar y el rol se quedan. */}
        {name ? <span className={styles.name}>{name}</span> : null}
      </span>

      {/* Solo aparece para quien puja: un funcionario no tiene billetera que mirar. */}
      <EcicoinBalance />

      <Pill tone="cyan" dot>
        {ROLE_LABELS[principal.role]}
      </Pill>

      <Button variant="quiet" onClick={() => void logout()}>
        Salir
      </Button>
    </div>
  );
}

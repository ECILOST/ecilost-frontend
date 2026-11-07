import type { CSSProperties } from 'react';
import { Icon } from '@/shared/components/ui/icon';
import { MEDALS } from '../domain/medals';
import type { MedalId, MedalProgress } from '../model/gamification';
import styles from './medal-badges.module.css';

/**
 * Insignias junto a un alias (sala, chat, top): circulos pequeños con el icono de cada
 * medalla. El nombre va en el `title` para el raton y en texto oculto para el lector de
 * pantalla, que si no oiria solo el alias.
 */
export function MedalBadges({
  medals,
  size = 'sm',
}: {
  medals: readonly MedalId[] | undefined;
  size?: 'sm' | 'md';
}) {
  if (!medals || medals.length === 0) return null;
  const names = medals.map((id) => MEDALS[id].name);
  return (
    <span className={[styles.badges, styles[size]].join(' ')}>
      <span className={styles.srOnly}>
        {names.length === 1 ? 'Medalla: ' : 'Medallas: '}
        {names.join(', ')}
      </span>
      {medals.map((id) => (
        <span
          key={id}
          className={styles.badge}
          title={`${MEDALS[id].name}: ${MEDALS[id].description}`}
          style={{ '--medal': MEDALS[id].color } as CSSProperties}
          aria-hidden="true"
        >
          <Icon name={MEDALS[id].icon} size={size === 'sm' ? 11 : 14} />
        </span>
      ))}
    </span>
  );
}

/** Capsula con icono y nombre, para destacar medallas en la cabecera del perfil y el podio. */
export function MedalChip({ id }: { id: MedalId }) {
  const medal = MEDALS[id];
  return (
    <span
      className={styles.chip}
      title={medal.description}
      style={{ '--medal': medal.color } as CSSProperties}
    >
      <Icon name={medal.icon} size={13} />
      {medal.name}
    </span>
  );
}

/** Tarjeta de la grilla del perfil: desbloqueada con brillo, o atenuada con su avance. */
export function MedalCard({ medal }: { medal: MedalProgress }) {
  const meta = MEDALS[medal.id];
  const unlocked = medal.unlockedAt !== null;
  const percent = Math.round((medal.progress / medal.goal) * 100);
  return (
    <li
      className={[styles.card, unlocked ? styles.unlocked : styles.locked].join(
        ' ',
      )}
      style={{ '--medal': meta.color } as CSSProperties}
    >
      <span className={styles.medallion} aria-hidden="true">
        <Icon name={unlocked ? meta.icon : 'lock'} size={24} />
      </span>
      <span className={styles.name}>{meta.name}</span>
      <span className={styles.description}>{meta.description}</span>
      {unlocked ? (
        <span className={styles.state}>Desbloqueada</span>
      ) : (
        <>
          <span
            className={styles.track}
            role="progressbar"
            aria-label={`Avance de ${meta.name}`}
            aria-valuemin={0}
            aria-valuemax={medal.goal}
            aria-valuenow={medal.progress}
          >
            <span style={{ width: `${percent}%` }} />
          </span>
          <span className={styles.state}>
            {medal.progress} de {medal.goal}
          </span>
        </>
      )}
    </li>
  );
}

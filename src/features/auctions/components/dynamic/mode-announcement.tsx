import { useEffect, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from '@/shared/components/ui/icon';
import { MODE_META } from '../../domain/dynamic-modes';
import type { RoundMode } from '../../model/auction';
import styles from './dynamic.module.css';
import { SEGMENT_ICON } from './roulette-wheel';

/** Cuantos segundos dura el anuncio antes de dar paso a la ronda. */
export const ANNOUNCEMENT_SECONDS = 3;

type DynamicMode = Exclude<RoundMode, 'CLASSIC'>;

/** Un icono por regla, en el mismo orden que `MODE_META[mode].rules`. */
const RULE_ICONS: Record<DynamicMode, [IconName, IconName, IconName]> = {
  DUTCH: ['trend-down', 'hand', 'users'],
  SEALED: ['lock', 'eye', 'trophy'],
  MYSTERY: ['search', 'bolt', 'sparkle'],
};

const CONFETTI = [
  { color: 'var(--eci-yellow)', top: '12%', left: '9%', rotate: 30 },
  { color: '#fff', top: '18%', left: '78%', rotate: -20 },
  { color: 'var(--eci-cyan)', bottom: '16%', left: '12%', rotate: 60 },
  { color: 'var(--eci-purple)', bottom: '12%', right: '10%', rotate: 15 },
  { color: '#fff', top: '9%', right: '30%', rotate: -40 },
  { color: 'var(--eci-yellow)', bottom: '30%', right: '6%', rotate: 75 },
];

/**
 * Presentacion de la modalidad, como la de un nivel en un videojuego: la pantalla se apaga,
 * se enciende un foco del color de la modalidad y aparecen su nombre, la frase y sus tres
 * reglas, con una barra que se vacia hasta empezar. Al terminar (o al tocarla) da paso a la
 * interfaz de juego.
 */
export function ModeAnnouncement({
  mode,
  position,
  total,
  onDone,
}: {
  mode: DynamicMode;
  position: number;
  total: number;
  onDone: () => void;
}) {
  const meta = MODE_META[mode];
  const [left, setLeft] = useState(ANNOUNCEMENT_SECONDS);

  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, onDone]);

  return (
    <div
      className={styles.announce}
      style={{ '--mode': meta.color, '--announce-ms': `${ANNOUNCEMENT_SECONDS * 1000}ms` } as CSSProperties}
      role="alertdialog"
      aria-modal="true"
      aria-label={`La ronda ${position} se juega como ${meta.label}`}
      onClick={onDone}
    >
      <span className={styles.announceFloor} aria-hidden="true" />
      {CONFETTI.map(({ color, rotate, ...place }, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={styles.confetti}
          style={{ background: color, transform: `rotate(${rotate}deg)`, ...place }}
        />
      ))}

      <div className={styles.announceInner}>
        <span className={styles.announceTag}>
          <span className={styles.announceDot} aria-hidden="true" />
          Ronda {position} de {total} · nueva modalidad
        </span>

        <span className={styles.announceEmblem} aria-hidden="true">
          <Icon name={SEGMENT_ICON[mode]} size={44} />
        </span>

        <h2 className={styles.announceTitle}>
          {meta.title[0]}
          <br />
          <span>{meta.title[1]}</span>
        </h2>
        <p className={styles.announceTagline}>{meta.tagline}</p>

        <ol className={styles.announceRules}>
          {meta.rules.map((rule, index) => (
            <li key={rule} style={{ animationDelay: `${180 + index * 90}ms` }}>
              <span className={styles.ruleIcon} aria-hidden="true">
                <Icon name={RULE_ICONS[mode][index]} size={20} />
              </span>
              <span className={styles.ruleNumber} aria-hidden="true">
                0{index + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>

        <div className={styles.announceCount}>
          <p aria-live="assertive">
            La ronda empieza en <strong>{Math.max(left, 1)}</strong>
          </p>
          <span className={styles.announceBar} aria-hidden="true">
            <span />
          </span>
          <small>Toca en cualquier parte para empezar ya</small>
        </div>
      </div>
    </div>
  );
}

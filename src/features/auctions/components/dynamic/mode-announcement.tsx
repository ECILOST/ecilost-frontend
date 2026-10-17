import { useEffect, useState } from 'react';
import { MODE_META } from '../../domain/dynamic-modes';
import type { RoundMode } from '../../model/auction';
import styles from './dynamic.module.css';

/** Cuantos segundos dura el anuncio antes de dar paso a la ronda. */
export const ANNOUNCEMENT_SECONDS = 3;

const CONFETTI = [
  { color: 'var(--eci-yellow)', top: '8%', left: '7%', rotate: 30 },
  { color: '#fff', top: '12%', left: '46%', rotate: -20 },
  { color: 'var(--eci-cyan)', bottom: '12%', left: '10%', rotate: 60 },
  { color: 'var(--eci-purple)', bottom: '9%', right: '9%', rotate: 15 },
  { color: '#fff', top: '9%', right: '14%', rotate: -40 },
];

/**
 * Toda la pantalla cambia al color de la modalidad y anuncia como se juega la ronda que
 * empieza: nombre, la frase, sus tres reglas y una cuenta 3, 2, 1. Al terminar (o al tocarla)
 * da paso a la interfaz de juego.
 */
export function ModeAnnouncement({
  mode,
  position,
  total,
  onDone,
}: {
  mode: Exclude<RoundMode, 'CLASSIC'>;
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
      style={{ background: meta.color }}
      role="alertdialog"
      aria-modal="true"
      aria-label={`La ronda ${position} se juega como ${meta.label}`}
      onClick={onDone}
    >
      {CONFETTI.map(({ color, rotate, ...place }, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={styles.confetti}
          style={{ background: color, transform: `rotate(${rotate}deg)`, ...place }}
        />
      ))}
      <div>
        <span className={styles.announceTag}>
          Ronda {position} de {total} · modalidad
        </span>
        <div className={styles.announceHead}>
          <span className={styles.announceBlob} style={{ color: meta.color }} aria-hidden="true">
            {meta.glyph}
          </span>
          <h2 className={styles.announceTitle}>
            {meta.title[0]}
            <br />
            {meta.title[1]}
          </h2>
        </div>
        <p className={styles.announceTagline}>{meta.tagline}</p>
      </div>
      <div>
        <ul className={styles.announceRules}>
          {meta.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className={styles.announceCount} aria-live="assertive">
          Empieza en <strong>{Math.max(left, 1)}</strong>
        </p>
      </div>
    </div>
  );
}

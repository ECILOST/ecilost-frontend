import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { segmentMeta } from '../../domain/dynamic-modes';
import type { SpinSegment } from '../../model/auction';
import styles from './dynamic.module.css';
import { RouletteWheel, rotationFor, SPIN_DURATION_MS } from './roulette-wheel';

/** Cuanto queda a la vista el resultado despues de detenerse la ruleta. */
const RESULT_HOLD_MS = 3_500;

/**
 * La sala ve girar la ruleta que giro el dueño: el resultado ya lo decidio el servidor, aqui
 * solo se anima hasta el. Se cierra sola poco despues de detenerse.
 */
export function RouletteReveal({
  segment,
  position,
  onClose,
}: {
  segment: SpinSegment;
  position: number;
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [stopped, setStopped] = useState(false);
  const meta = segmentMeta(segment);

  useEffect(() => {
    // Un fotograma en reposo antes de girar, para que la transicion tenga desde donde partir.
    const start = requestAnimationFrame(() => setRotation(rotationFor(segment, 0)));
    const stop = setTimeout(() => setStopped(true), SPIN_DURATION_MS);
    const close = setTimeout(onClose, SPIN_DURATION_MS + RESULT_HOLD_MS);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(stop);
      clearTimeout(close);
    };
  }, [segment, onClose]);

  return (
    <Dialog open onClose={onClose} title={`Ruleta de la ronda ${position}`} tone="cyan">
      <div className={styles.rouletteBody}>
        <p className={styles.label}>Ruleta · ronda {position}</p>
        <RouletteWheel rotation={rotation} highlight={stopped ? segment : null} />
        <div aria-live="polite">
          {stopped ? (
            <>
              <span className={styles.rouletteResult} style={{ background: meta.color }}>
                {segment === 'WILDCARD' ? '¡Comodín!' : `¡${meta.label}!`}
              </span>
              <p className={styles.rouletteHint} style={{ marginTop: '0.6rem' }}>
                {segment === 'WILDCARD'
                  ? 'El organizador vuelve a girar la ruleta.'
                  : `La ronda ${position} se jugará así.`}
              </p>
            </>
          ) : (
            <p className={styles.rouletteHint}>El organizador giró la ruleta…</p>
          )}
        </div>
        {stopped ? (
          <Button variant="secondary" onClick={onClose}>
            Entendido
          </Button>
        ) : null}
      </div>
    </Dialog>
  );
}

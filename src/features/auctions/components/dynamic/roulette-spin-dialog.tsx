import { useState } from 'react';
import { ErrorState } from '@/shared/components/error-state';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { segmentMeta } from '../../domain/dynamic-modes';
import type { SpinSegment } from '../../model/auction';
import styles from './dynamic.module.css';
import { RouletteWheel, rotationFor, SPIN_DURATION_MS } from './roulette-wheel';

export interface SpinOutcome {
  segment: SpinSegment;
  canSpinAgain: boolean;
}

/**
 * La ruleta del dueño de la sala. Al pulsar "Girar" se pide el resultado al servidor y se
 * anima hasta el; si sale comodin, se puede girar otra vez.
 */
export function RouletteSpinDialog({
  position,
  onSpin,
  onClose,
}: {
  position: number;
  /** Gira en el servidor y devuelve lo que marco la ruleta. */
  onSpin: () => Promise<SpinOutcome>;
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinOutcome | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function spin() {
    setError(null);
    setResult(null);
    setSpinning(true);
    try {
      const outcome = await onSpin();
      setRotation((current) => rotationFor(outcome.segment, current));
      setTimeout(() => {
        setResult(outcome);
        setSpinning(false);
      }, SPIN_DURATION_MS);
    } catch (caught) {
      setError(caught);
      setSpinning(false);
    }
  }

  const meta = result ? segmentMeta(result.segment) : null;
  const decided = result !== null && !result.canSpinAgain;

  return (
    <Dialog open onClose={spinning ? () => undefined : onClose} title={`Ruleta de la ronda ${position}`} tone="cyan">
      <div className={styles.rouletteBody}>
        <h2 className={styles.rouletteTitle}>Ruleta · ronda {position}</h2>
        <RouletteWheel rotation={rotation} highlight={result?.segment ?? null} />
        <div aria-live="polite">
          {result && meta ? (
            <>
              <span className={styles.rouletteResult} style={{ background: meta.color }}>
                {result.segment === 'WILDCARD' ? '¡Comodín!' : `¡${meta.label}!`}
              </span>
              <p className={styles.rouletteHint} style={{ marginTop: '0.6rem' }}>
                {result.canSpinAgain
                  ? 'Gira otra vez para decidir la modalidad.'
                  : `La ronda ${position} se jugará así. Los participantes lo verán al empezar.`}
              </p>
            </>
          ) : (
            <p className={styles.rouletteHint}>
              {spinning ? 'Girando…' : 'El servidor decide el resultado. Cada modalidad tiene la misma probabilidad.'}
            </p>
          )}
        </div>
        {error ? <ErrorState error={error} /> : null}
        <div className={styles.rouletteActions}>
          {decided ? (
            <Button onClick={onClose}>Listo</Button>
          ) : (
            <Button onClick={() => void spin()} disabled={spinning}>
              ↻ {result?.canSpinAgain ? 'Girar otra vez' : 'Girar ruleta'}
            </Button>
          )}
          {!decided && !spinning ? (
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

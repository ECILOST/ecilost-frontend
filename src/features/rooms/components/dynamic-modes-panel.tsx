import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RouletteSpinDialog } from '@/features/auctions/components/dynamic/roulette-spin-dialog';
import { MODE_META } from '@/features/auctions/domain/dynamic-modes';
import { ErrorState } from '@/shared/components/error-state';
import { Button } from '@/shared/components/ui/button';
import { Pill } from '@/shared/components/ui/pill';
import { Toggle } from '@/shared/components/ui/toggle';
import { roomKeys, useSetDynamicModes, useSpinRoulette } from '../hooks/use-rooms';
import type { RoomDetail, RoundDetail } from '../model/room';
import styles from './dynamic-modes-panel.module.css';

/**
 * Subastas dinamicas, para el dueño de la sala (quien la programo): activar la ruleta y
 * girarla antes de cada ronda. Las rondas que nadie gira se juegan como subasta clasica.
 */
export function DynamicModesPanel({ room }: { room: RoomDetail }) {
  const queryClient = useQueryClient();
  const toggle = useSetDynamicModes(room.id);
  const spin = useSpinRoulette(room.id);
  const [spinning, setSpinning] = useState<RoundDetail | null>(null);
  const enabled = room.dynamicModesEnabled ?? false;
  const finished = room.status === 'CLOSED' || room.status === 'CANCELLED';

  return (
    <section className={styles.panel} aria-labelledby="dynamic-modes-title">
      <div className={styles.head}>
        <div>
          <h2 id="dynamic-modes-title" className={styles.title}>
            🎡 Subastas dinámicas
          </h2>
          <p className={styles.hint}>
            Gira la ruleta antes de cada ronda: holandesa, sobre cerrado, lote misterioso o
            comodín (gira otra vez). Solo tú, que programaste la sala, puedes usarla.
          </p>
        </div>
        <div className={styles.switch}>
          <Toggle
            checked={enabled}
            label="Subastas dinámicas"
            disabled={toggle.isPending || finished}
            onChange={(next) => toggle.mutate(next)}
          />
          <span>{enabled ? 'Activadas' : 'Desactivadas'}</span>
        </div>
      </div>

      {toggle.error ? <ErrorState error={toggle.error} /> : null}

      {enabled ? (
        <ol className={styles.rounds}>
          {room.rounds.map((round) => {
            const mode = round.mode ?? 'CLASSIC';
            const meta = mode === 'CLASSIC' ? null : MODE_META[mode];
            const canSpin = round.status === 'SCHEDULED' && !round.modeLocked;
            return (
              <li key={round.id} className={styles.round}>
                <span className={styles.position}>{round.position}</span>
                <span className={styles.mode}>
                  {meta ? (
                    <Pill tone={meta.tone}>
                      {meta.glyph} {meta.label}
                    </Pill>
                  ) : (
                    <Pill tone="neutral">{round.status === 'SCHEDULED' ? 'Sin girar · clásica' : 'Clásica'}</Pill>
                  )}
                  {round.wildcardSpins ? (
                    <span className={styles.hint}>
                      {round.wildcardSpins} comodín{round.wildcardSpins > 1 ? 'es' : ''}
                    </span>
                  ) : null}
                </span>
                {canSpin ? (
                  <Button size="md" onClick={() => setSpinning(round)}>
                    ↻ Girar ruleta
                  </Button>
                ) : (
                  <span className={styles.hint}>
                    {round.status === 'SCHEDULED' ? 'Decidida' : round.status === 'ACTIVE' ? 'En curso' : 'Terminada'}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.hint}>
          Con la ruleta desactivada todas las rondas se juegan como subasta clásica.
        </p>
      )}

      {spinning ? (
        <RouletteSpinDialog
          position={spinning.position}
          onSpin={async () => {
            const result = await spin.mutateAsync(spinning.id);
            return { segment: result.segment, canSpinAgain: result.canSpinAgain };
          }}
          onClose={() => {
            setSpinning(null);
            void queryClient.invalidateQueries({ queryKey: roomKeys.detail(room.id) });
          }}
        />
      ) : null}
    </section>
  );
}

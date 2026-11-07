import { SPIN_SEGMENTS, type SpinSegment } from '../../model/auction';
import type { CSSProperties } from 'react';
import { Icon, ICON_PATHS, type IconName } from '@/shared/components/ui/icon';
import { segmentMeta } from '../../domain/dynamic-modes';
import styles from './dynamic.module.css';

/** Cuanto dura el giro. La pantalla espera esto antes de anunciar el resultado. */
export const SPIN_DURATION_MS = 3_200;

const SEGMENT_ANGLE = 360 / SPIN_SEGMENTS.length;
const RADIUS = 120;
const CENTER = 130;

/**
 * Giro que deja `segment` bajo el puntero de arriba, dando antes `turns` vueltas completas.
 * Se suma a la rotacion anterior para que la ruleta siempre gire hacia adelante.
 */
export function rotationFor(segment: SpinSegment, from: number, turns = 5): number {
  const index = SPIN_SEGMENTS.indexOf(segment);
  const target = (360 - index * SEGMENT_ANGLE) % 360;
  const base = from - (from % 360);
  return base + turns * 360 + target;
}

function point(angleDeg: number, radius = RADIUS) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

/** Icono de linea por segmento: los mismos de la guia y de las capsulas de modalidad. */
export const SEGMENT_ICON: Record<SpinSegment, IconName> = {
  DUTCH: 'trend-down',
  SEALED: 'mail',
  MYSTERY: 'help',
  WILDCARD: 'spin',
};

/** Bombillas del aro: una por cada 15 grados, como el marco de un concurso de television. */
const BULBS = Array.from({ length: 24 }, (_, index) => point(index * 15, 124));

/**
 * La ruleta de modalidades. Solo pinta: el resultado lo decide el servidor y la pantalla
 * pasa la rotacion que lo deja bajo el puntero (`rotationFor`).
 *
 * Es la pieza "de concurso" de la aplicacion: aro con bombillas, segmentos con degradado y
 * volumen, y un puntero que brilla. Lo demas de la sala es sobrio; esto no.
 */
export function RouletteWheel({
  rotation,
  highlight = null,
  size = 300,
  spinning = false,
}: {
  rotation: number;
  /** Con un segmento, los demas se apagan: es el estado "la ruleta ya decidio". */
  highlight?: SpinSegment | null;
  size?: number;
  /** Mientras gira, las bombillas parpadean. */
  spinning?: boolean;
}) {
  return (
    <div
      className={[styles.wheelBox, spinning ? styles.wheelSpinning : ''].join(' ')}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="-6 -6 272 272"
        width={size}
        height={size}
        role="img"
        aria-label={
          highlight
            ? `Ruleta detenida en ${segmentMeta(highlight).label}`
            : 'Ruleta de modalidades: holandesa, sobre cerrado, lote misterioso y comodín'
        }
      >
        <defs>
          {SPIN_SEGMENTS.map((segment) => (
            <radialGradient key={segment} id={`seg-${segment}`} cx="50%" cy="50%" r="55%">
              <stop offset="20%" stopColor={segmentMeta(segment).color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={segmentMeta(segment).color} />
            </radialGradient>
          ))}
          <radialGradient id="wheel-rim" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#1d3a66" />
            <stop offset="100%" stopColor="#081830" />
          </radialGradient>
          <radialGradient id="wheel-hub" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#1b3159" />
            <stop offset="100%" stopColor="#050f1f" />
          </radialGradient>
          <radialGradient id="wheel-shade" cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Aro exterior con bombillas */}
        <circle cx={CENTER} cy={CENTER} r={133} fill="url(#wheel-rim)" stroke="rgb(140 180 255 / 30%)" strokeWidth={1.5} />
        {BULBS.map((bulb, index) => (
          <circle
            key={index}
            cx={bulb.x}
            cy={bulb.y}
            r={2.6}
            className={index % 2 ? styles.bulbB : styles.bulbA}
          />
        ))}

        <g
          className={styles.wheel}
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: `${SPIN_DURATION_MS}ms`,
          }}
        >
          {SPIN_SEGMENTS.map((segment, index) => {
            const meta = segmentMeta(segment);
            const start = index * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
            const end = start + SEGMENT_ANGLE;
            const a = point(start);
            const b = point(end);
            const label = point(index * SEGMENT_ANGLE, 70);
            const dimmed = highlight !== null && highlight !== segment;
            const ink = segment === 'WILDCARD' ? 'var(--eci-on-accent)' : '#fff';
            return (
              <g key={segment} className={dimmed ? styles.segmentDim : styles.segment}>
                <path
                  d={`M${CENTER} ${CENTER} L${a.x} ${a.y} A${RADIUS} ${RADIUS} 0 0 1 ${b.x} ${b.y} Z`}
                  fill={`url(#seg-${segment})`}
                  stroke="rgb(4 16 31 / 85%)"
                  strokeWidth={2.5}
                />
                <g transform={`rotate(${index * SEGMENT_ANGLE} ${label.x} ${label.y})`}>
                  <svg
                    x={label.x - 13}
                    y={label.y - 30}
                    width={26}
                    height={26}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ink}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={ICON_PATHS[SEGMENT_ICON[segment]]} />
                  </svg>
                  <text
                    x={label.x}
                    y={label.y + 12}
                    textAnchor="middle"
                    className={styles.wheelLabel}
                    fill={ink}
                  >
                    {meta.label}
                  </text>
                </g>
              </g>
            );
          })}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#wheel-shade)" pointerEvents="none" />
        </g>

        {/* Buje */}
        <circle cx={CENTER} cy={CENTER} r={36} fill="url(#wheel-hub)" stroke="var(--eci-cyan)" strokeWidth={2.5} className={styles.hub} />
        <text x={CENTER} y={CENTER + 5} textAnchor="middle" className={styles.wheelHub}>
          ECI
        </text>

        {/* Puntero */}
        <g className={styles.pointer}>
          <path d="M116 -4 L144 -4 L130 24 Z" fill="var(--eci-cyan)" stroke="#04101f" strokeWidth={2} strokeLinejoin="round" />
          <circle cx={130} cy={2} r={3} fill="#04101f" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Leyenda bajo la ruleta: que significa cada color, con su icono. Sin ella, quien ve girar la
 * ruleta por primera vez solo ve cuatro colores.
 */
export function SegmentLegend({ active = null }: { active?: SpinSegment | null }) {
  return (
    <ul className={styles.legend} aria-label="Qué puede salir">
      {SPIN_SEGMENTS.map((segment) => {
        const meta = segmentMeta(segment);
        return (
          <li
            key={segment}
            className={active === segment ? styles.legendActive : active ? styles.legendDim : undefined}
            style={{ '--mode': meta.color } as CSSProperties}
          >
            <span className={styles.legendIcon} aria-hidden="true">
              <Icon name={SEGMENT_ICON[segment]} size={16} />
            </span>
            <span>
              <strong>{meta.label}</strong>
              <small>{meta.tagline}</small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

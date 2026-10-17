import { SPIN_SEGMENTS, type SpinSegment } from '../../model/auction';
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

/**
 * La ruleta de modalidades. Solo pinta: el resultado lo decide el servidor y la pantalla
 * pasa la rotacion que lo deja bajo el puntero (`rotationFor`).
 */
export function RouletteWheel({
  rotation,
  highlight = null,
  size = 260,
}: {
  rotation: number;
  /** Con un segmento, los demas se apagan: es el estado "la ruleta ya decidio". */
  highlight?: SpinSegment | null;
  size?: number;
}) {
  return (
    <div className={styles.wheelBox} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 260 260"
        width={size}
        height={size}
        role="img"
        aria-label={
          highlight
            ? `Ruleta detenida en ${segmentMeta(highlight).label}`
            : 'Ruleta de modalidades: holandesa, sobre cerrado, lote misterioso y comodín'
        }
      >
        <circle cx={CENTER} cy={CENTER} r={128} fill="var(--eci-surface-high)" />
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
            const label = point(index * SEGMENT_ANGLE, 74);
            const dimmed = highlight !== null && highlight !== segment;
            return (
              <g key={segment} opacity={dimmed ? 0.25 : 1}>
                <path
                  d={`M${CENTER} ${CENTER} L${a.x} ${a.y} A${RADIUS} ${RADIUS} 0 0 1 ${b.x} ${b.y} Z`}
                  fill={meta.color}
                />
                <g transform={`rotate(${index * SEGMENT_ANGLE} ${label.x} ${label.y})`}>
                  <text
                    x={label.x}
                    y={label.y - 6}
                    textAnchor="middle"
                    className={styles.wheelGlyph}
                    fill={segment === 'WILDCARD' ? 'var(--eci-on-accent)' : '#fff'}
                  >
                    {meta.glyph}
                  </text>
                  <text
                    x={label.x}
                    y={label.y + 14}
                    textAnchor="middle"
                    className={styles.wheelLabel}
                    fill={segment === 'WILDCARD' ? 'var(--eci-on-accent)' : '#fff'}
                  >
                    {meta.label}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
        <circle cx={CENTER} cy={CENTER} r={34} fill="var(--eci-void)" stroke="var(--eci-cyan)" strokeWidth={3} />
        <text x={CENTER} y={CENTER + 5} textAnchor="middle" className={styles.wheelHub}>
          ECI
        </text>
        <path d="M118 0 L142 0 L130 22 Z" fill="var(--eci-cyan)" />
      </svg>
    </div>
  );
}

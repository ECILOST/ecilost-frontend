import type { ReactNode } from 'react';
import styles from './object-illustration.module.css';

/**
 * Objetos dibujados a mano: los ejemplos de la portada y, en el catalogo de subastas, el
 * objeto que todavia no tiene fotografia. Son ilustraciones propias, sin marcas: un dibujo
 * generico de "audifonos" no promete un modelo que no es.
 *
 * Un trazo de tinta y rellenos planos de la paleta decorativa, como pegatinas sobre la placa.
 */
export type ObjectKind =
  | 'umbrella'
  | 'headphones'
  | 'bottle'
  | 'calculator'
  | 'backpack'
  | 'watch'
  | 'laptop'
  | 'book'
  | 'glasses'
  | 'speaker'
  | 'gamepad'
  | 'sneaker';

/** Palabras con las que se reconoce cada objeto por su nombre o categoria. */
const KEYWORDS: Array<[ObjectKind, RegExp]> = [
  ['umbrella', /paraguas|sombrilla/],
  ['headphones', /audifono|auricular|headphone|diadema/],
  ['bottle', /termo|botella|tomatodo|cantimplora/],
  ['calculator', /calculadora/],
  ['backpack', /mochila|maleta|morral/],
  ['watch', /reloj|smartwatch/],
  ['laptop', /portatil|laptop|computador|macbook|tablet/],
  ['book', /libro|cuaderno|agenda|libreta/],
  ['glasses', /gafas|lentes|anteojos/],
  ['speaker', /parlante|altavoz|bocina/],
  ['gamepad', /control|mando|joystick|gamepad/],
  ['sneaker', /tenis|zapato|zapatilla|calzado/],
];

/**
 * Que dibujo le corresponde a un objeto real. `null` si no se reconoce: entonces se pinta su
 * inicial, que es mejor que un dibujo equivocado.
 */
export function objectKindFor(...texts: Array<string | null | undefined>): ObjectKind | null {
  const text = texts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const match = KEYWORDS.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : null;
}

export function ObjectIllustration({ kind }: { kind: ObjectKind }) {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      {DRAWINGS[kind]}
    </svg>
  );
}

const DRAWINGS: Record<ObjectKind, ReactNode> = {
  umbrella: (
    <>
      <path
        className={styles.fillPink}
        d="M14 58C16 33 36 17 60 17s44 16 46 41c-6-5-12-5-17 0-6-5-12-5-18 0-5-5-12-5-17 0-6-5-12-5-17 0-6-5-12-5-23 0z"
      />
      <path
        className={styles.fillYellow}
        d="M60 17c-10 6-15 22-12 41 4-4 9-4 12 0 3-4 8-4 12 0 3-19-2-35-12-41z"
      />
      <path className={styles.line} d="M60 17v-6" />
      <path className={styles.line} d="M60 58v38a8 8 0 0 1-16 0" />
      <path
        className={styles.outline}
        d="M14 58C16 33 36 17 60 17s44 16 46 41c-6-5-12-5-17 0-6-5-12-5-18 0-5-5-12-5-17 0-6-5-12-5-17 0-6-5-12-5-23 0z"
      />
    </>
  ),
  headphones: (
    <>
      <path className={styles.line} d="M26 70V58a34 34 0 0 1 68 0v12" />
      <rect className={styles.fillBlue} x="18" y="62" width="20" height="34" rx="10" />
      <rect className={styles.fillBlue} x="82" y="62" width="20" height="34" rx="10" />
      <rect className={styles.outline} x="18" y="62" width="20" height="34" rx="10" />
      <rect className={styles.outline} x="82" y="62" width="20" height="34" rx="10" />
      <path className={styles.lineThin} d="M26 72v16M94 72v16" />
    </>
  ),
  bottle: (
    <>
      <rect className={styles.fillTeal} x="40" y="30" width="40" height="76" rx="14" />
      <rect className={styles.fillPurple} x="40" y="54" width="40" height="22" />
      <rect className={styles.outline} x="40" y="30" width="40" height="76" rx="14" />
      <rect className={styles.fillYellow} x="46" y="12" width="28" height="18" rx="6" />
      <rect className={styles.outline} x="46" y="12" width="28" height="18" rx="6" />
      <path className={styles.lineThin} d="M40 54h40M40 76h40" />
      <path className={styles.shine} d="M50 40v8" />
    </>
  ),
  calculator: (
    <>
      <rect className={styles.fillPurple} x="28" y="12" width="64" height="96" rx="12" />
      <rect className={styles.outline} x="28" y="12" width="64" height="96" rx="12" />
      <rect className={styles.fillScreen} x="38" y="22" width="44" height="20" rx="4" />
      <rect className={styles.outline} x="38" y="22" width="44" height="20" rx="4" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            className={row === 2 && col === 2 ? styles.fillYellow : styles.fillKey}
            x={38 + col * 16}
            y={52 + row * 17}
            width="12"
            height="11"
            rx="3"
          />
        )),
      )}
    </>
  ),
  backpack: (
    <>
      <path className={styles.fillTeal} d="M30 46a30 30 0 0 1 60 0v50a10 10 0 0 1-10 10H40a10 10 0 0 1-10-10z" />
      <path className={styles.outline} d="M30 46a30 30 0 0 1 60 0v50a10 10 0 0 1-10 10H40a10 10 0 0 1-10-10z" />
      <path className={styles.lineThin} d="M48 16a12 12 0 0 1 24 0" />
      <rect className={styles.fillYellow} x="40" y="66" width="40" height="28" rx="8" />
      <rect className={styles.outline} x="40" y="66" width="40" height="28" rx="8" />
      <path className={styles.lineThin} d="M40 78h40" />
      <path className={styles.shine} d="M40 40a20 20 0 0 1 10-12" />
    </>
  ),
  watch: (
    <>
      <rect className={styles.fillPurple} x="44" y="8" width="32" height="104" rx="10" />
      <rect className={styles.outline} x="44" y="8" width="32" height="104" rx="10" />
      <rect className={styles.fillKey} x="32" y="34" width="56" height="52" rx="16" />
      <rect className={styles.fillScreen} x="39" y="41" width="42" height="38" rx="10" />
      <rect className={styles.outline} x="32" y="34" width="56" height="52" rx="16" />
      <path className={styles.line} d="M60 50v12l8 5" />
      <path className={styles.lineThin} d="M88 54v12" />
    </>
  ),
  laptop: (
    <>
      <rect className={styles.fillBlue} x="22" y="24" width="76" height="52" rx="8" />
      <rect className={styles.outline} x="22" y="24" width="76" height="52" rx="8" />
      <rect className={styles.fillScreen} x="30" y="32" width="60" height="36" rx="4" />
      <path className={styles.fillYellow} d="M10 80h100l-6 14a6 6 0 0 1-5.5 4h-77a6 6 0 0 1-5.5-4z" />
      <path className={styles.outline} d="M10 80h100l-6 14a6 6 0 0 1-5.5 4h-77a6 6 0 0 1-5.5-4z" />
      <path className={styles.lineThin} d="M50 86h20" />
      <path className={styles.shine} d="M38 40l10-0" />
    </>
  ),
  book: (
    <>
      <path className={styles.fillPink} d="M26 18h56a10 10 0 0 1 10 10v74H36a10 10 0 0 1-10-10z" />
      <path className={styles.outline} d="M26 18h56a10 10 0 0 1 10 10v74H36a10 10 0 0 1-10-10z" />
      <path className={styles.fillKey} d="M26 92a10 10 0 0 1 10-10h56v20H36a10 10 0 0 1-10-10z" />
      <path className={styles.lineThin} d="M36 92h46" />
      <rect className={styles.fillYellow} x="44" y="34" width="34" height="16" rx="4" />
      <rect className={styles.outline} x="44" y="34" width="34" height="16" rx="4" />
    </>
  ),
  glasses: (
    <>
      <path className={styles.line} d="M10 52l10-14M110 52l-10-14" />
      <rect className={styles.fillTeal} x="12" y="50" width="40" height="30" rx="14" />
      <rect className={styles.fillTeal} x="68" y="50" width="40" height="30" rx="14" />
      <rect className={styles.outline} x="12" y="50" width="40" height="30" rx="14" />
      <rect className={styles.outline} x="68" y="50" width="40" height="30" rx="14" />
      <path className={styles.line} d="M52 60q8-8 16 0" />
      <path className={styles.shine} d="M22 60l6-4M78 60l6-4" />
    </>
  ),
  speaker: (
    <>
      <rect className={styles.fillPurple} x="30" y="14" width="60" height="92" rx="14" />
      <rect className={styles.outline} x="30" y="14" width="60" height="92" rx="14" />
      <circle className={styles.fillKey} cx="60" cy="72" r="20" />
      <circle className={styles.outline} cx="60" cy="72" r="20" />
      <circle className={styles.fillYellow} cx="60" cy="72" r="8" />
      <circle className={styles.fillKey} cx="60" cy="36" r="8" />
      <circle className={styles.outline} cx="60" cy="36" r="8" />
    </>
  ),
  gamepad: (
    <>
      <path className={styles.fillBlue} d="M34 38h52a22 22 0 0 1 21 28l-6 24a12 12 0 0 1-21 4l-8-12H48l-8 12a12 12 0 0 1-21-4l-6-24a22 22 0 0 1 21-28z" />
      <path className={styles.outline} d="M34 38h52a22 22 0 0 1 21 28l-6 24a12 12 0 0 1-21 4l-8-12H48l-8 12a12 12 0 0 1-21-4l-6-24a22 22 0 0 1 21-28z" />
      <path className={styles.line} d="M38 52v16M30 60h16" />
      <circle className={styles.fillYellow} cx="80" cy="54" r="5" />
      <circle className={styles.fillPink} cx="90" cy="64" r="5" />
      <circle className={styles.outline} cx="80" cy="54" r="5" />
      <circle className={styles.outline} cx="90" cy="64" r="5" />
    </>
  ),
  sneaker: (
    <>
      <path className={styles.fillPink} d="M14 84V54a6 6 0 0 1 6-6h14l8 10 16-4c14 10 30 14 44 16a12 12 0 0 1 10 12v2z" />
      <path className={styles.outline} d="M14 84V54a6 6 0 0 1 6-6h14l8 10 16-4c14 10 30 14 44 16a12 12 0 0 1 10 12v2z" />
      <path className={styles.fillKey} d="M12 84h100v8a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" />
      <path className={styles.lineThin} d="M48 62l6 8M58 60l6 8M68 64l5 7" />
    </>
  ),
};

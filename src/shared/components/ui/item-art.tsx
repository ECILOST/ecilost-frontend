import { useState, type CSSProperties, type ReactNode } from 'react';
import styles from './item-art.module.css';
import { ObjectIllustration, objectKindFor } from './object-illustration';
import { PhotoPlate } from './photo-plate';

/**
 * Pares de colores de las manchas, tal como aparecen en el diseño. Cada objeto recibe uno
 * por hash de su identificador: el catalogo se ve multicolor y cada objeto conserva sus
 * colores entre visitas.
 */
const PAIRS: Array<[string, string]> = [
  ['var(--deco-purple)', 'var(--deco-teal)'],
  ['var(--deco-blue)', 'var(--deco-purple)'],
  ['var(--deco-pink)', 'var(--deco-blue)'],
  ['var(--deco-teal)', 'var(--deco-purple)'],
  ['var(--deco-purple)', 'var(--deco-blue)'],
  ['var(--deco-blue)', 'var(--deco-teal)'],
  ['var(--deco-teal)', 'var(--deco-blue)'],
  ['var(--deco-purple)', 'var(--deco-pink)'],
];

function hash(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return value;
}

export function artColors(seed: string): [string, string, string, string] {
  const [c1, c2] = PAIRS[hash(seed) % PAIRS.length];
  // Los dos acentos que no estan en el par, para las piezas sueltas del collage grande.
  const extras = [
    'var(--deco-pink)',
    'var(--deco-teal)',
    'var(--deco-blue)',
    'var(--deco-purple)',
  ].filter((color) => color !== c1 && color !== c2);
  return [c1, c2, extras[0], extras[1]];
}

/** Primera letra con significado: salta numeros y signos ("2 audifonos" -> "A"). */
function initial(label: string): string {
  const match = label.match(/\p{L}/u);
  return (match ? match[0] : label.charAt(0) || '?').toUpperCase();
}

export type ItemArtVariant = 'card' | 'object' | 'hero' | 'thumb' | 'plain';

/**
 * El objeto sobre su collage de manchas.
 *
 * - `object`: como los ejemplos de la portada (catalogo "ECI LOST"): tres manchas planas y
 *   el objeto en un plato blanco con aro. Para las tarjetas de subasta.
 * - `card`: dos manchas grandes, para las tarjetas del catalogo.
 * - `hero`: cuatro manchas, para el objeto en subasta y la ficha.
 * - `thumb`: dos degradados radiales, para miniaturas de listas.
 * - `plain`: panel liso (sala de espera, sin objeto protagonista).
 *
 * Sin fotografia se muestra el nombre con un icono, como los marcadores del diseño. Es
 * decorativo: quien lo usa siempre escribe el nombre al lado.
 */
export function ItemArt({
  seed,
  label,
  src,
  variant = 'card',
  dimmed = false,
  className,
  children,
  colors,
  hint,
}: {
  seed: string;
  label: string;
  src?: string | null;
  variant?: ItemArtVariant;
  /** Atenua las manchas: sala en modo solo seguimiento. */
  dimmed?: boolean;
  className?: string;
  /** Piezas encima del arte: capsula de estado, reloj. */
  children?: ReactNode;
  /** Colores fijos en vez de los del hash: el lote misterioso se pinta siempre en violeta. */
  colors?: [string, string, string, string];
  /** Categoria del objeto: ayuda a elegir su dibujo cuando no tiene fotografia. */
  hint?: string | null;
}) {
  const [c1, c2, c3, c4] = colors ?? artColors(seed);
  // Un enlace firmado vencido responde 403: en vez de una imagen rota se pinta el marcador.
  // Se recuerda que URL fallo, asi que un enlace nuevo vuelve a intentarse solo.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const image = src && src !== failedSrc ? src : null;
  const style = {
    '--c1': c1,
    '--c2': c2,
    '--c3': c3,
    '--c4': c4,
  } as CSSProperties;

  // Sin foto, el dibujo del objeto si se reconoce por su nombre o categoria. El lote
  // misterioso ('?') nunca: dibujarlo revelaria lo que esta oculto.
  const placeholderKind = image || label === '?' ? null : objectKindFor(label, hint);

  if (variant === 'object') {
    const kind = placeholderKind;
    return (
      <div
        className={[styles.art, styles.object, dimmed ? styles.dimmed : '', className]
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        <span className={`${styles.blob} ${styles.b1}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.b2}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.b3}`} aria-hidden="true" />
        <span className={styles.dish}>
          {image ? (
            <img
              className={styles.dishPhoto}
              src={image}
              alt={label}
              loading="lazy"
              onError={() => setFailedSrc(image)}
            />
          ) : kind ? (
            <ObjectIllustration kind={kind} />
          ) : (
            <span className={styles.dishInitial} aria-hidden="true">
              {initial(label)}
            </span>
          )}
        </span>
        {children}
      </div>
    );
  }

  return (
    <div
      className={[
        styles.art,
        styles[variant],
        dimmed ? styles.dimmed : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {variant === 'card' || variant === 'hero' ? (
        <>
          <span className={`${styles.blob} ${styles.b1}`} aria-hidden="true" />
          <span className={`${styles.blob} ${styles.b2}`} aria-hidden="true" />
        </>
      ) : null}
      {variant === 'hero' ? (
        <>
          <span className={`${styles.blob} ${styles.b3}`} aria-hidden="true" />
          <span className={`${styles.blob} ${styles.b4}`} aria-hidden="true" />
        </>
      ) : null}

      {image ? (
        /*
         * La misma placa que el catalogo: la foto entera, con la forma de la foto, y las
         * manchas detras. Antes la foto llenaba el recuadro y se recortaba por los lados.
         */
        <PhotoPlate
          className={styles.plate}
          size={variant === 'thumb' ? 'thumb' : 'box'}
          src={image}
          alt={label}
          onError={() => setFailedSrc(image)}
        />
      ) : variant === 'thumb' ? null : (
        // Decorativo: el nombre del objeto siempre esta escrito al lado, en su titulo.
        <span className={styles.placeholder} aria-hidden="true">
          <span className={styles.token}>
            {placeholderKind ? (
              <ObjectIllustration kind={placeholderKind} />
            ) : (
              initial(label)
            )}
          </span>
          <span className={styles.placeholderLabel}>{label}</span>
        </span>
      )}

      {dimmed ? <span className={styles.veil} aria-hidden="true" /> : null}
      {children}
    </div>
  );
}

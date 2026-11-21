/**
 * Dibujos lineales de objetos tipicos de "objetos perdidos" para la portada publica. Son
 * ilustraciones, no fotos reales: la portada no consulta ningun servicio y no debe fingir
 * inventario. Todos sobre la misma reticula de 64 y el mismo trazo.
 */
export type ObjectGlyphName =
  'glasses' | 'bottle' | 'calculator' | 'headphones' | 'umbrella' | 'book';

const PATHS: Record<ObjectGlyphName, string> = {
  glasses:
    'M6 30h52M10 30c0 8 4 13 11 13s11-5 11-13M32 30c0 8 4 13 11 13s11-5 11-13M28 31c2-2 6-2 8 0',
  bottle:
    'M26 8h12v6H26zM24 14h16v4c3 2 4 5 4 9v27a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V27c0-4 1-7 4-9zM44 28h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4M20 34h24',
  calculator:
    'M16 6h32a3 3 0 0 1 3 3v46a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zM19 12h26v10H19zM21 31h4M30 31h4M39 31h4M21 39h4M30 39h4M39 39h4M21 47h4M30 47h4M39 47h4',
  headphones:
    'M12 40v-6a20 20 0 0 1 40 0v6M8 40h10v16H12a4 4 0 0 1-4-4zM56 40H46v16h6a4 4 0 0 0 4-4z',
  umbrella:
    'M6 30a26 22 0 0 1 52 0c-4-3-9-3-13 0-4-3-9-3-13 0-4-3-9-3-13 0-4-3-9-3-13 0zM32 30v20a5 5 0 0 1-10 0M32 6v3',
  book: 'M10 12c8-3 15-3 22 2v40c-7-5-14-5-22-2zM54 12c-8-3-15-3-22 2v40c7-5 14-5 22-2z',
};

export function ObjectGlyph({
  name,
  size = 64,
}: {
  name: ObjectGlyphName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

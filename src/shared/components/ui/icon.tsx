export type IconName = 'grid' | 'live' | 'photo';

const PATHS: Record<IconName, string> = {
  grid: 'M4 5.5h6v6H4zM14 5.5h6v6h-6zM4 14.5h6v4H4zM14 14.5h6v4h-6z',
  live: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM12 8v4.2l3 1.8',
  photo: 'M4 6.5h16v11H4zM4 14l4.5-4 4 3.5L16 10l4 4',
};

/**
 * Iconos de trazo, dibujados con el color del texto que los rodea.
 *
 * Siempre acompañan a una etiqueta y nunca la sustituyen, asi que se marcan como
 * decorativos: un lector de pantalla que anuncie "cuadricula, Catalogo" dice lo mismo dos
 * veces.
 */
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

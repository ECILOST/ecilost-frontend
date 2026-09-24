export type IconName =
  | 'grid'
  | 'live'
  | 'photo'
  | 'layers'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'upload'
  | 'close'
  | 'alert'
  | 'coin'
  | 'image'
  | 'search'
  | 'bell'
  | 'bolt'
  | 'cart'
  | 'eye'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'check'
  | 'play'
  | 'star'
  | 'minus'
  | 'timer'
  | 'swap';

/**
 * Un glifo por nombre, todos dibujados sobre la misma reticula de 24 y con el mismo grosor
 * de trazo. Se declaran como cadenas y no como archivos sueltos porque son pocos: un paquete
 * de iconos entero para esto pesaria mas que la aplicacion.
 */
const PATHS: Record<IconName, string> = {
  grid: 'M4 5.5h6v6H4zM14 5.5h6v6h-6zM4 14.5h6v4H4zM14 14.5h6v4h-6z',
  live: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM12 8v4.2l3 1.8',
  photo: 'M4 6.5h16v11H4zM4 14l4.5-4 4 3.5L16 10l4 4',
  layers: 'M12 3.5 3.5 8l8.5 4.5L20.5 8zM3.5 12.5 12 17l8.5-4.5',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20.5h4l11-11-4-4-11 11zM14.5 5.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5',
  upload: 'M12 15.5V4M7.5 8.5 12 4l4.5 4.5M4.5 16.5v3.5h15v-3.5',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  alert: 'M12 4 21 20H3zM12 10.5v3.5M12 16.8v.2',
  coin: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM9.5 10h5M9.5 14h5M12 7.5v9',
  image: 'M4.5 5h15v14h-15zM4.5 15.5l4-4 3.5 3.5 2.5-2.5 5 5M15 9.2v.1',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5h4',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  cart: 'M3.5 4.5h2.5l2.2 10.5h9.3l2-7.5H7M9.5 19.5v.1M16.5 19.5v.1',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  play: 'M8 5.5v13l10-6.5z',
  star: 'M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z',
  minus: 'M6 12h12',
  timer:
    'M12 8v4.5l2.5 1.5M9.5 3h5M12 5.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z',
  swap: 'M5 8.5h13l-3.5-3.5M19 15.5H6l3.5 3.5',
};

/**
 * Iconos de trazo, dibujados con el color del texto que los rodea.
 *
 * Por defecto acompañan a una etiqueta y nunca la sustituyen, asi que se marcan como
 * decorativos: un lector de pantalla que anuncie "cuadricula, Catalogo" dice lo mismo dos
 * veces. Cuando el icono va solo dentro de un boton, el nombre accesible lo pone el boton
 * con `aria-label`, no el dibujo.
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

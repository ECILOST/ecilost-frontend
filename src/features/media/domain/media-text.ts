import type { MediaAsset } from '../model/media';

/**
 * Como se describe una pieza multimedia con palabras.
 *
 * Vive aparte de los componentes porque el mismo texto lo usan la ficha y la galeria, y una
 * fotografia descrita de dos maneras distintas en la misma pantalla confunde a quien la
 * escucha en vez de verla.
 *
 * El servicio no guarda texto alternativo, asi que se describe la posicion: repetir el
 * nombre del objeto en cada fotografia no aporta nada nuevo despues de la primera.
 */
export function photoAlt(photo: MediaAsset): string {
  return `Fotografía ${photo.position + 1} del objeto`;
}

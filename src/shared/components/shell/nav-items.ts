import { routes } from '@/app/routes';
import type { IconName } from '../ui/icon';
import type { Capability } from '@/shared/guards/require-capability';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /**
   * Capacidad que hace visible la entrada. Se declara junto a la ruta y no dentro del
   * componente de navegacion para que agregar una seccion sea tocar esta lista y nada mas.
   */
  requires?: Capability;
}

/**
 * Secciones de la aplicacion, en el orden en que se muestran arriba y abajo.
 *
 * Una sola lista para las dos barras: si la de escritorio y la del movil se escribieran por
 * separado, acabarian diciendo cosas distintas.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: routes.items, label: 'Catálogo', icon: 'grid' },
  /*
   * Sin capacidad: `GET /lots` lo atiende cualquier sesion valida, y saber que objetos se
   * van a subastar juntos le sirve al estudiante antes de entrar a una sala. Lo que si pide
   * ser funcionario es crearlos, y eso se decide dentro de la pantalla.
   */
  { to: routes.lots, label: 'Lotes', icon: 'layers' },
  { to: routes.rooms, label: 'Salas', icon: 'live', requires: 'canBid' },
  {
    to: routes.rechargeWallet,
    label: 'Billetera',
    icon: 'coin',
    requires: 'canManageWallets',
  },
];

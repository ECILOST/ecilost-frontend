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
  /** Solo activa con la direccion exacta (la portada, que es prefijo de todo). */
  end?: boolean;
}

/**
 * Secciones de la aplicacion, en el orden en que se muestran arriba y abajo.
 *
 * Una sola lista para las dos barras: si la de escritorio y la del movil se escribieran por
 * separado, acabarian diciendo cosas distintas. Las cuatro primeras son las del diseño para
 * quien puja; las de administracion solo las ve un funcionario, por capacidad.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: routes.home,
    label: 'Inicio',
    icon: 'live',
    requires: 'canBid',
    end: true,
  },
  { to: routes.auctions, label: 'Subastas', icon: 'grid', requires: 'canBid' },
  {
    to: routes.wallet,
    label: 'Mi billetera',
    icon: 'coin',
    requires: 'canBid',
  },
  { to: routes.myBids, label: 'Mis pujas', icon: 'bolt', requires: 'canBid' },

  {
    to: routes.items,
    label: 'Catálogo',
    icon: 'grid',
    requires: 'canManageCatalog',
  },
  {
    to: routes.lots,
    label: 'Lotes',
    icon: 'layers',
    requires: 'canManageCatalog',
  },
  {
    to: routes.rechargeWallet,
    label: 'Recargas',
    icon: 'coin',
    requires: 'canManageWallets',
  },
];

import { routes } from '@/app/routes';
import type { IconName } from '../ui/icon';
import type { Capability } from '@/shared/guards/require-capability';

/**
 * Prioridad de la entrada. `primary` es lo que se usa a diario y va primero y mas grande;
 * `secondary` se consulta de vez en cuando y va despues, separado. Asi la barra no presenta
 * cinco opciones con el mismo peso (ley de Hick) y el cajon del movil se lee en dos bloques.
 */
export type NavGroup = 'primary' | 'secondary';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  group: NavGroup;
  /**
   * Capacidad que hace visible la entrada. Se declara junto a la ruta y no dentro del
   * componente de navegacion para que agregar una seccion sea tocar esta lista y nada mas.
   */
  requires?: Capability;
  /** Solo activa con la direccion exacta (la portada, que es prefijo de todo). */
  end?: boolean;
}

/**
 * Secciones de la aplicacion, en el orden en que se muestran.
 *
 * Una sola lista para la barra de escritorio y el cajon del movil: escritas por separado,
 * acabarian diciendo cosas distintas. Las de quien puja y las de administracion se excluyen
 * por capacidad, nunca por rol.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    to: routes.home,
    label: 'Inicio',
    icon: 'live',
    group: 'primary',
    requires: 'canBid',
    end: true,
  },
  {
    to: routes.auctions,
    label: 'Subastas',
    icon: 'grid',
    group: 'primary',
    requires: 'canBid',
  },
  {
    to: routes.myBids,
    label: 'Mis pujas',
    icon: 'bolt',
    group: 'primary',
    requires: 'canBid',
  },
  {
    to: routes.wallet,
    label: 'Mi billetera',
    icon: 'coin',
    group: 'secondary',
    requires: 'canBid',
  },
  {
    to: routes.leaderboard,
    label: 'Top semanal',
    icon: 'trophy',
    group: 'secondary',
    requires: 'canBid',
  },

  {
    to: routes.items,
    label: 'Catálogo',
    icon: 'grid',
    group: 'primary',
    requires: 'canManageCatalog',
  },
  {
    to: routes.lots,
    label: 'Lotes',
    icon: 'layers',
    group: 'primary',
    requires: 'canManageCatalog',
  },
  {
    to: routes.managedRooms,
    label: 'Salas',
    icon: 'timer',
    group: 'primary',
    requires: 'canScheduleRooms',
  },
  {
    to: routes.staffPickups,
    label: 'Recogidas',
    icon: 'check',
    group: 'secondary',
    requires: 'canManageCatalog',
  },
  {
    to: routes.rechargeWallet,
    label: 'Recargas',
    icon: 'coin',
    group: 'secondary',
    requires: 'canManageWallets',
  },
];

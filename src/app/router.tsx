import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/login.page';
import { ItemDetailPage } from '@/features/catalog/pages/item-detail.page';
import {
  EditItemPage,
  NewItemPage,
} from '@/features/catalog/pages/item-form.page';
import { ItemsPage } from '@/features/catalog/pages/items.page';
import { LotDetailPage } from '@/features/lots/pages/lot-detail.page';
import { LotFormPage } from '@/features/lots/pages/lot-form.page';
import { LotsPage } from '@/features/lots/pages/lots.page';
import { RoomsPage } from '@/features/rooms/pages/rooms.page';
import { RechargePage } from '@/features/wallet/pages/recharge.page';
import { NotFound } from '@/shared/components/not-found';
import { PageShell } from '@/shared/components/shell/page-shell';
import { RequireAuth } from '@/shared/guards/require-auth';
import { RequireCapability } from '@/shared/guards/require-capability';
import { routePatterns, routes } from './routes';

/**
 * Mapa de rutas: que pantalla atiende cada direccion y bajo que guard. Nada mas.
 *
 * El guard envuelve un grupo de rutas en vez de repetirse dentro de cada pantalla, por la
 * misma razon por la que en el back `@UseGuards` va en el controlador y no en cada metodo:
 * una pantalla nueva no puede quedar desprotegida por olvido.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path={routes.login} element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<PageShell />}>
          <Route index element={<Navigate to={routes.items} replace />} />
          <Route path={routes.items} element={<ItemsPage />} />
          <Route path={routePatterns.item} element={<ItemDetailPage />} />
          <Route path={routes.rooms} element={<RoomsPage />} />

          {/* Consultar lotes lo permite cualquier sesion; armarlos, no. */}
          <Route path={routes.lots} element={<LotsPage />} />
          <Route path={routePatterns.lot} element={<LotDetailPage />} />

          {/*
            Administrar el catalogo va detras de la capacidad, no del rol, igual que el
            menu. Esconder una entrada no autoriza nada: el servicio sigue comprobando el
            rol en su endpoint, y esto solo evita pintar un formulario cuyo envio seria un
            403 seguro.
          */}
          <Route element={<RequireCapability capability="canManageCatalog" />}>
            <Route path={routes.newItem} element={<NewItemPage />} />
            <Route path={routePatterns.editItem} element={<EditItemPage />} />
            <Route path={routes.newLot} element={<LotFormPage />} />
          </Route>

          {/*
            La billetera va por su propia capacidad y no por la del catalogo: abonar ECICoin
            no es administrar objetos perdidos, y hoy coincidan o no en el mismo rol es una
            casualidad del reparto actual.
          */}
          <Route element={<RequireCapability capability="canManageWallets" />}>
            <Route path={routes.rechargeWallet} element={<RechargePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

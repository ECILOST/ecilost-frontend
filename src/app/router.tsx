import { Navigate, Route, Routes } from 'react-router-dom';
import { AuctionDetailPage } from '@/features/auctions/pages/auction-detail.page';
import { AuctionsPage } from '@/features/auctions/pages/auctions.page';
import { HomePage } from '@/features/auctions/pages/home.page';
import { MyBidsPage } from '@/features/auctions/pages/my-bids.page';
import { NotificationsPage } from '@/features/auctions/pages/notifications.page';
import { RoomPage } from '@/features/auctions/pages/room/room.page';
import { useSession } from '@/features/auth/hooks/use-session';
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
import { ManagedRoomDetailPage } from '@/features/rooms/pages/managed-room-detail.page';
import { ManagedRoomsPage } from '@/features/rooms/pages/managed-rooms.page';
import { ScheduleRoomPage } from '@/features/rooms/pages/schedule-room.page';
import { RechargePage } from '@/features/wallet/pages/recharge.page';
import { WalletPage } from '@/features/wallet/pages/wallet.page';
import { NotFound } from '@/shared/components/not-found';
import { PageShell } from '@/shared/components/shell/page-shell';
import { RequireAuth } from '@/shared/guards/require-auth';
import { RequireCapability } from '@/shared/guards/require-capability';
import { routePatterns, routes } from './routes';

/**
 * La portada depende de quien entra: quien puja ve las subastas; un funcionario no puja, y
 * su punto de partida es el catalogo que administra.
 */
function HomeRoute() {
  const { principal } = useSession();
  if (principal && !principal.canBid)
    return <Navigate to={routes.items} replace />;
  return <HomePage />;
}

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
          <Route index element={<HomeRoute />} />
          {/* Destino del login en auth-service: se conserva y lleva a la portada. */}
          <Route
            path={routes.rooms}
            element={<Navigate to={routes.home} replace />}
          />

          {/* Pujar es de estudiantes: las pantallas de subasta van detras de `canBid`. */}
          <Route element={<RequireCapability capability="canBid" />}>
            <Route path={routes.auctions} element={<AuctionsPage />} />
            <Route path={routes.wallet} element={<WalletPage />} />
            <Route path={routes.myBids} element={<MyBidsPage />} />
            <Route
              path={routes.notifications}
              element={<NotificationsPage />}
            />
          </Route>

          <Route path={routes.items} element={<ItemsPage />} />
          <Route path={routePatterns.item} element={<ItemDetailPage />} />

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
            Abonar ECICoin va por su propia capacidad y no por la del catalogo: abonar no es
            administrar objetos perdidos.
          */}
          <Route element={<RequireCapability capability="canManageWallets" />}>
            <Route path={routes.rechargeWallet} element={<RechargePage />} />
          </Route>

          {/* Programar salas tiene su propia capacidad: no es administrar el catalogo. */}
          <Route element={<RequireCapability capability="canScheduleRooms" />}>
            <Route path={routes.managedRooms} element={<ManagedRoomsPage />} />
            <Route path={routes.newRoom} element={<ScheduleRoomPage />} />
            <Route
              path={routePatterns.managedRoom}
              element={<ManagedRoomDetailPage />}
            />
          </Route>
        </Route>

        {/*
          Sala y ficha van sin la navegacion general, como en el diseño: traen su propia barra
          con la flecha de vuelta y no compiten con la puja.
        */}
        <Route element={<PageShell focus />}>
          <Route element={<RequireCapability capability="canBid" />}>
            <Route
              path={routePatterns.auction}
              element={<AuctionDetailPage />}
            />
            <Route path={routePatterns.room} element={<RoomPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

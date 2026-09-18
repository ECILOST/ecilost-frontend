import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/login.page';
import { ItemDetailPage } from '@/features/catalog/pages/item-detail.page';
import { ItemsPage } from '@/features/catalog/pages/items.page';
import { RoomsPage } from '@/features/rooms/pages/rooms.page';
import { NotFound } from '@/shared/components/not-found';
import { PageShell } from '@/shared/components/shell/page-shell';
import { RequireAuth } from '@/shared/guards/require-auth';
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
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

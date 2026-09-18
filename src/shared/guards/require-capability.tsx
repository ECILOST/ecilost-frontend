import { Outlet } from 'react-router-dom';
import { useSession } from '@/features/auth/hooks/use-session';
import { Notice } from '../components/ui/notice';
import { Page } from '../components/ui/page';

/** Las banderas que publica `GET /auth/me`. */
export type Capability = 'canManageCatalog' | 'canScheduleRooms' | 'canBid';

const CAPABILITY_MESSAGES: Record<Capability, string> = {
  canManageCatalog: 'Administrar el catálogo es una operación de funcionario.',
  canScheduleRooms: 'Programar salas es una operación de funcionario.',
  canBid:
    'Solo los estudiantes pujan: quien dirige la subasta no compite en ella.',
};

/**
 * Contraparte de `RolesGuard`, pero por capacidad y no por rol.
 *
 * El servicio publica banderas en vez de pedirle al cliente que traduzca el rol, asi que
 * ramificar aqui por `role === 'STAFF'` volveria a cablear esa traduccion en el front, que
 * es lo que las banderas venian a evitar.
 */
export function RequireCapability({ capability }: { capability: Capability }) {
  const { principal } = useSession();

  if (!principal?.[capability]) {
    return (
      <Page>
        <Notice
          tone="alert"
          live="alert"
          title="No tienes permiso para esta pantalla"
        >
          {CAPABILITY_MESSAGES[capability]}
        </Notice>
      </Page>
    );
  }

  return <Outlet />;
}

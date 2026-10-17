import { Link, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useSession } from '@/features/auth/hooks/use-session';
import { MediaViewer } from '@/features/media/components/media-viewer';
import { MediaKind } from '@/features/media/model/media';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { blobSeed } from '@/shared/components/ui/blob-frame';
import { BackLink, Page, PageHeader } from '@/shared/components/ui/page';
import { formatDate } from '@/shared/format/date';
import { LotPhotoManager } from '../components/lot-photo-manager';
import { LotStatusBadge } from '../components/lot-status-badge';
import { useLot } from '../hooks/use-lot';
import styles from './lot-detail.page.module.css';

/**
 * Ficha de un lote (HU-06).
 *
 * El lote entrega de cada objeto solo el identificador y el nombre, asi que cada fila es un
 * enlace a su ficha en vez de un intento de resumirla aqui: la condicion, el estado y las
 * fotografias viven en el catalogo, y duplicarlas obligaria a una peticion por objeto.
 */
export function LotDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: lot, isPending, error, refetch } = useLot(id);
  const { principal } = useSession();

  if (isPending) {
    return (
      <Page>
        <Loading label="Cargando el lote..." />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageHeader title="Lote" back={{ to: routes.lots, label: 'Lotes' }} />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Page>
    );
  }

  return (
    <Page>
      <BackLink to={routes.lots} label="Lotes" />

      <Flash />

      {/*
        El mismo visor que la ficha de un objeto: la portada en su placa y, si hay mas, la fila
        de miniaturas. Sin fotografias queda el collage con la inicial del lote.
      */}
      <MediaViewer
        photos={(lot.photos ?? []).map((photo) => ({
          ...photo,
          kind: MediaKind.PHOTO,
        }))}
        video={null}
        palette={blobSeed(lot.id).palette}
        shape={blobSeed(lot.id).shape}
        fallback={lot.name.charAt(0).toUpperCase()}
        badge={<LotStatusBadge status={lot.status} />}
      />

      <div className={styles.titleBlock}>
        <h1>{lot.name}</h1>
        <div className={styles.chips}>
          <LotStatusBadge status={lot.status} />
          <span className={styles.created}>
            Armado el {formatDate(lot.createdAt)}
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Objetos del lote ({lot.items.length})
        </h2>

        <ul className={styles.items}>
          {lot.items.map((item) => (
            <li key={item.id}>
              <Link className={styles.item} to={routes.item(item.id)}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemGo} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {principal?.canManageCatalog ? (
        <LotPhotoManager lotId={lot.id} photos={lot.photos ?? []} />
      ) : null}

      {/*
        Se dice lo que no se puede hacer, porque no hay ningun boton que lo insinue: el
        servicio no publica forma de editar el lote, de sacarle un objeto ni de deshacerlo.
        Callarlo dejaria a la persona buscando un control que no existe.
      */}
      <p className={styles.note}>
        Los objetos de un lote no se pueden cambiar ni deshacer desde aquí:
        quedan reservados hasta que la sala de subastas los libere.
      </p>
    </Page>
  );
}

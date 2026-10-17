import { Link, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { MediaViewer } from '@/features/media/components/media-viewer';
import { MediaKind } from '@/features/media/model/media';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { blobSeed } from '@/shared/components/ui/blob-frame';
import { BackLink, Page, PageHeader } from '@/shared/components/ui/page';
import { formatDate } from '@/shared/format/date';
import { LotStatusBadge } from '../components/lot-status-badge';
import { useLot } from '../hooks/use-lot';
import styles from './lot-detail.page.module.css';

/**
 * Ficha de un lote (HU-06).
 *
 * El lote no tiene fotografias propias: muestra las que ya se adjuntaron a cada objeto, y
 * basta con tocar una miniatura para verla en grande. Cada fila de objeto enlaza a su ficha,
 * porque la condicion y el estado viven en el catalogo.
 */
export function LotDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: lot, isPending, error, refetch } = useLot(id);

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
        El mismo visor que la ficha de un objeto, con las fotografias de todos sus objetos: la
        grande en su placa y la fila de miniaturas para cambiar de una a otra. La leyenda dice
        de que objeto es la que se ve. Sin fotografias queda el collage con la inicial del lote.
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
        describe={(photo) =>
          `Fotografía ${photo.position + 1} de ${photo.itemName}`
        }
        caption={(photo) => (
          <>
            <span>
              Fotografía de{' '}
              <strong className={styles.photoOf}>{photo.itemName}</strong>
            </span>
            <Link className={styles.photoLink} to={routes.item(photo.itemId)}>
              Ver objeto →
            </Link>
          </>
        )}
        emptyText="Los objetos de este lote todavía no tienen fotografías"
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

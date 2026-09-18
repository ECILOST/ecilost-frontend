import { useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { MediaGallery } from '@/features/media/components/media-gallery';
import { photoAlt } from '@/features/media/domain/media-text';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Loading } from '@/shared/components/loading';
import { BlobFrame, blobSeed } from '@/shared/components/ui/blob-frame';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { Pill } from '@/shared/components/ui/pill';
import { formatDate } from '@/shared/format/date';
import { ItemStatusBadge } from '../components/item-status-badge';
import { ITEM_CONDITION_LABELS } from '../domain/item-condition';
import { useItem } from '../hooks/use-item';
import { isItemDetail } from '../model/item';
import styles from './item-detail.page.module.css';

/**
 * Ficha del objeto (HU-08).
 *
 * El recorte por rol no se hace aqui: el servicio manda la ficha completa a un funcionario
 * y la recortada a un estudiante. Esta pantalla solo comprueba si llego el rastro
 * administrativo antes de mostrarlo, porque para el estudiante ese campo no existe.
 */
export function ItemDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: item, isPending, error, refetch } = useItem(id);

  if (isPending) {
    return (
      <Page>
        <Loading label="Cargando la ficha..." />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageHeader
          title="Ficha del objeto"
          back={{ to: routes.items, label: 'Catálogo' }}
        />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Page>
    );
  }

  const { tone, shape } = blobSeed(item.id);
  // La portada es la primera fotografia; el resto vive en la galeria, sin repetirla.
  const cover = item.photos.at(0);
  const rest = item.photos.slice(1);
  const hasMoreMedia = rest.length > 0 || item.video !== null;
  const hasNoMedia = item.photos.length === 0 && item.video === null;

  return (
    <Page>
      <PageHeader
        eyebrow={item.category}
        title={item.name}
        back={{ to: routes.items, label: 'Catálogo' }}
        actions={<ItemStatusBadge status={item.status} />}
      />

      <div className={styles.hero}>
        <BlobFrame
          className={styles.plate}
          size="lg"
          tone={tone}
          shape={shape}
          src={cover?.url}
          alt={cover ? photoAlt(cover) : ''}
          fit="cover"
          fallback={item.name.charAt(0).toUpperCase()}
        />

        <div className={styles.summary}>
          <p className={styles.description}>{item.description}</p>
          <div className={styles.facts}>
            <Pill tone="blue">{item.category}</Pill>
            <Pill tone="neutral">
              Estado físico: {ITEM_CONDITION_LABELS[item.condition]}
            </Pill>
          </div>
        </div>
      </div>

      {hasMoreMedia ? (
        <MediaGallery
          photos={rest}
          video={item.video}
          title={rest.length ? 'Más fotografías' : 'Video del objeto'}
        />
      ) : null}

      {/* Solo cuando no hay nada: con portada, decir que no hay fotografias seria mentira. */}
      {hasNoMedia ? (
        <EmptyState title="Este objeto todavía no tiene fotografías ni video" />
      ) : null}

      <dl className={styles.detail}>
        <div>
          <dt>Registrado</dt>
          <dd>{formatDate(item.registeredAt)}</dd>
        </div>
        {isItemDetail(item) ? (
          <div>
            <dt>Versión</dt>
            <dd>{item.version}</dd>
          </div>
        ) : null}
      </dl>
    </Page>
  );
}

import { useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useSession } from '@/features/auth/hooks/use-session';
import { LotLink } from '@/features/lots/components/lot-link';
import { MediaManager } from '@/features/media/components/media-manager';
import { MediaViewer } from '@/features/media/components/media-viewer';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { blobSeed } from '@/shared/components/ui/blob-frame';
import { BackLink, Page, PageHeader } from '@/shared/components/ui/page';
import { Pill } from '@/shared/components/ui/pill';
import { formatDate } from '@/shared/format/date';
import { ItemActions } from '../components/item-actions';
import { ItemStatusBadge } from '../components/item-status-badge';
import { ITEM_CONDITION_LABELS } from '../domain/item-condition';
import { useItem } from '../hooks/use-item';
import { isItemDetail } from '../model/item';
import styles from './item-detail.page.module.css';

/**
 * Ficha del objeto (HU-08).
 *
 * El recorte de datos por rol no se hace aqui: el servicio manda la ficha completa a un
 * funcionario y la recortada a un estudiante, y esta pantalla pinta lo que llega.
 *
 * Lo que si decide aqui es que herramientas se ofrecen, y va por capacidad y no por rol:
 * arriba, la ficha que ve cualquiera; al final, agrupado, lo que solo tiene sentido para
 * quien administra el catalogo.
 */
export function ItemDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { principal } = useSession();
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

  const { palette, shape } = blobSeed(item.id);

  return (
    <Page>
      <BackLink to={routes.items} label="Catálogo" />

      <Flash />

      <MediaViewer
        photos={item.photos}
        video={item.video}
        palette={palette}
        shape={shape}
        fallback={item.name.charAt(0).toUpperCase()}
        badge={<ItemStatusBadge status={item.status} solid />}
      />

      <div className={styles.titleBlock}>
        <h1 className={styles.name}>{item.name}</h1>
        <div className={styles.chips}>
          <Pill tone="blue">{item.category}</Pill>
          <Pill tone="neutral">
            Estado físico: {ITEM_CONDITION_LABELS[item.condition]}
          </Pill>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Descripción</h2>
        <p className={styles.description}>{item.description}</p>
      </div>

      <dl className={styles.detail}>
        <div>
          <dt>Registrado</dt>
          <dd>{formatDate(item.registeredAt)}</dd>
        </div>

        {/*
          Solo cuando pertenece a uno. Es lo que explica por que este objeto no se puede
          editar el dia que cambie de estado, y da a donde ir a verlo.
        */}
        {item.lotId ? (
          <div>
            <dt>Lote</dt>
            <dd>
              <LotLink lotId={item.lotId} />
            </dd>
          </div>
        ) : null}
      </dl>

      {/*
        Todo lo que sigue son herramientas de funcionario, agrupadas al final y detras de la
        capacidad. La `version` que el servicio le manda no se pinta: es el numero del
        bloqueo optimista, no un dato del objeto, y suelto en la ficha no le dice nada a
        nadie. Se usa donde sirve, que es al editar y al borrar.
      */}
      {principal?.canManageCatalog ? (
        <>
          {/*
            `isItemDetail` no es una comprobacion de permiso, es un estrechamiento de tipo:
            las acciones necesitan la `version`, y la ficha recortada no la trae.
          */}
          {isItemDetail(item) ? <ItemActions item={item} /> : null}
          <MediaManager
            itemId={item.id}
            photos={item.photos}
            video={item.video}
          />
        </>
      ) : null}
    </Page>
  );
}

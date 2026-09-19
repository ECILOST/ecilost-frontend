import { Link, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { Flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { BackLink, Page, PageHeader } from '@/shared/components/ui/page';
import { formatDate } from '@/shared/format/date';
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
        Un lote no se puede modificar ni deshacer desde aquí: sus objetos quedan
        reservados hasta que la sala de subastas los libere.
      </p>
    </Page>
  );
}

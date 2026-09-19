import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ErrorState } from '@/shared/components/error-state';
import { flash } from '@/shared/components/flash';
import { Button, buttonClass } from '@/shared/components/ui/button';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { Icon } from '@/shared/components/ui/icon';
import { Notice } from '@/shared/components/ui/notice';
import {
  ITEM_STATUS_LABELS,
  ItemStatus,
  deletionBlockedReason,
  manualTransition,
} from '../domain/item-status';
import { useDeleteItem } from '../hooks/use-delete-item';
import { useUpdateItem } from '../hooks/use-update-item';
import type { ItemDetail } from '../model/item';
import styles from './item-actions.module.css';

/**
 * Acciones de funcionario sobre un objeto (HU-04).
 *
 * Recibe la ficha completa y no solo el identificador porque las tres operaciones necesitan
 * la `version` con la que se leyo: es lo que permite al servicio rechazar una escritura
 * hecha sobre datos que ya cambiaron.
 *
 * Solo se ofrece lo que el servicio puede aceptar. Retirar y reponer son las dos unicas
 * transiciones que mueve una persona; entrar a un lote, entrar a una ronda y venderse los
 * mueve el sistema. Y un objeto comprometido o vendido no se borra, asi que en vez del boton
 * va el motivo: un boton que solo sirve para recibir un 409 es peor que no tenerlo.
 */
export function ItemActions({ item }: { item: ItemDetail }) {
  const titleId = useId();
  const navigate = useNavigate();
  const update = useUpdateItem();
  const remove = useDeleteItem();

  const [confirming, setConfirming] = useState(false);
  /** Lo ultimo que salio bien, para confirmarlo sin salir de la ficha. */
  const [done, setDone] = useState<string | null>(null);

  const nextStatus = manualTransition(item.status);
  const blocked = deletionBlockedReason(item.status);
  const busy = update.isPending || remove.isPending;

  function changeStatus(status: ItemStatus): void {
    setDone(null);
    update.mutate(
      { id: item.id, request: { version: item.version, status } },
      {
        onSuccess: () =>
          setDone(
            status === ItemStatus.WITHDRAWN
              ? 'El objeto quedó retirado: ya no se ofrece en el catálogo.'
              : 'El objeto vuelve a estar disponible.',
          ),
      },
    );
  }

  return (
    <section className={styles.actions} aria-labelledby={titleId}>
      <h2 className={styles.title} id={titleId}>
        Administración
      </h2>

      {done ? (
        <Notice tone="success" live="status" title={done} />
      ) : null}

      {update.isError ? <ErrorState error={update.error} /> : null}
      {remove.isError ? <ErrorState error={remove.error} /> : null}

      <div className={styles.row}>
        <Link
          className={buttonClass('secondary')}
          to={routes.editItem(item.id)}
        >
          <Icon name="edit" size={18} />
          Editar datos
        </Link>

        {nextStatus ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => changeStatus(nextStatus)}
          >
            {nextStatus === ItemStatus.WITHDRAWN ? 'Retirar' : 'Reponer'}
          </Button>
        ) : null}

        {blocked ? null : (
          <Button
            variant="danger"
            disabled={busy}
            icon={<Icon name="trash" size={16} />}
            onClick={() => setConfirming(true)}
          >
            Borrar
          </Button>
        )}
      </div>

      {/*
        Retirar es reversible, y decirlo aqui evita que parezca lo mismo que borrar. La
        vuelta atras no es un "deshacer" escondido en un aviso que se va: es el mismo boton,
        que ahora dice Reponer.
      */}
      <p className={styles.hint}>
        {nextStatus === ItemStatus.WITHDRAWN
          ? 'Retirar lo saca del catálogo sin borrarlo; puedes reponerlo cuando quieras.'
          : null}
        {nextStatus === ItemStatus.AVAILABLE
          ? `Ahora está ${ITEM_STATUS_LABELS[item.status].toLowerCase()}. Reponerlo lo devuelve al catálogo.`
          : null}
        {blocked ? ` No se puede borrar: ${blocked.toLowerCase()}` : null}
      </p>

      <ConfirmDialog
        open={confirming}
        title="¿Borrar este objeto?"
        confirmLabel="Borrar"
        busy={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { id: item.id, version: item.version },
            {
              onSuccess: () =>
                navigate(routes.items, {
                  replace: true,
                  state: flash(`«${item.name}» se borró del catálogo.`),
                }),
              // Se cierra igual cuando falla: el motivo se lee en la ficha, detras del
              // dialogo, y no dentro de el.
              onSettled: () => setConfirming(false),
            },
          )
        }
        onCancel={() => setConfirming(false)}
      >
        Se borrarán también sus fotografías y su vídeo, y no se puede deshacer.
        Si solo quieres que deje de ofrecerse, retíralo en lugar de borrarlo.
      </ConfirmDialog>
    </section>
  );
}

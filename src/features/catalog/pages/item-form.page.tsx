import { useNavigate, useParams } from 'react-router-dom';
import { routes } from '@/app/routes';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import { ErrorState } from '@/shared/components/error-state';
import { flash } from '@/shared/components/flash';
import { Loading } from '@/shared/components/loading';
import { Button } from '@/shared/components/ui/button';
import { Notice } from '@/shared/components/ui/notice';
import { Page, PageHeader } from '@/shared/components/ui/page';
import { EMPTY_ITEM, ItemForm, type ItemFormValues } from '../components/item-form';
import { useCreateItem } from '../hooks/use-create-item';
import { useItem } from '../hooks/use-item';
import { useUpdateItem } from '../hooks/use-update-item';
import { isItemDetail } from '../model/item';

/**
 * Registro de un objeto perdido (HU-03).
 *
 * No se piden aqui ni el estado ni las fotografias. El estado porque el objeto nace
 * disponible y poder escribirlo permitiria registrar algo ya marcado como vendido; las
 * fotografias porque se adjuntan contra el objeto ya creado, y por eso el camino termina en
 * su ficha y no de vuelta en el catalogo.
 */
export function NewItemPage() {
  const navigate = useNavigate();
  const create = useCreateItem();

  return (
    <Page>
      <PageHeader
        eyebrow="Catálogo"
        title="Registrar objeto"
        back={{ to: routes.items, label: 'Catálogo' }}
      />

      <ItemForm
        initial={EMPTY_ITEM}
        submitLabel="Registrar objeto"
        pendingLabel="Registrando..."
        pending={create.isPending}
        error={create.error}
        failureTitle="No se pudo registrar el objeto"
        note={
          <>
            El objeto nace <strong>Disponible</strong> y sin fotografías. Al
            registrarlo llegarás a su ficha, que es donde se adjuntan.
          </>
        }
        onSubmit={(values: ItemFormValues) =>
          create.mutate(values, {
            onSuccess: (item) =>
              navigate(routes.item(item.id), {
                replace: true,
                state: flash(`«${item.name}» quedó registrado en el catálogo.`),
              }),
          })
        }
        onCancel={() => navigate(routes.items)}
      />
    </Page>
  );
}

/**
 * Edicion de un objeto registrado (HU-04).
 *
 * La ficha se vuelve a pedir al entrar aqui en vez de heredarla de la pantalla anterior,
 * porque lo que hace falta no son solo los valores: es la `version` con la que se leyeron.
 * Enviar una version vieja es exactamente lo que el servicio esta esperando para rechazar la
 * escritura, y esa es la garantia de que nadie pisa el cambio de otro.
 */
export function EditItemPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isPending, error, refetch } = useItem(id);
  const update = useUpdateItem();

  if (isPending) {
    return (
      <Page>
        <Loading label="Cargando el objeto..." />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageHeader
          title="Editar objeto"
          back={{ to: routes.items, label: 'Catálogo' }}
        />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Page>
    );
  }

  // Sin rastro administrativo no hay version, y sin version no se puede escribir. No deberia
  // ocurrir (la ruta exige la capacidad y el servicio manda la ficha completa a quien la
  // tiene), pero es preferible decirlo a mandar una edicion que el servicio no puede aceptar.
  if (!isItemDetail(item)) {
    return (
      <Page>
        <PageHeader
          title="Editar objeto"
          back={{ to: routes.item(id), label: 'Volver a la ficha' }}
        />
        <Notice tone="alert" live="alert" title="No se puede editar este objeto">
          El servicio no entregó la información de versión que hace falta para
          guardar cambios sin pisar los de otra persona.
        </Notice>
      </Page>
    );
  }

  const conflict =
    update.error instanceof ApiError &&
    update.error.is(ProblemType.VERSION_CONFLICT);

  return (
    <Page>
      <PageHeader
        eyebrow={item.name}
        title="Editar objeto"
        back={{ to: routes.item(item.id), label: 'Volver a la ficha' }}
      />

      {conflict ? (
        <Notice
          tone="alert"
          live="alert"
          title="Otra persona editó este objeto mientras lo tenías abierto"
          actions={
            <Button
              onClick={() => {
                update.reset();
                void refetch();
              }}
            >
              Cargar la versión actual
            </Button>
          }
        >
          Tus cambios no se guardaron. Carga la versión actual, mira qué cambió
          y vuelve a aplicar lo tuyo encima.
        </Notice>
      ) : null}

      {/*
        La clave es la version: al recargar despues de un conflicto, el formulario se monta
        de nuevo con lo que hay ahora. Sin esto seguiria enseñando los valores viejos encima
        del aviso que dice que estan obsoletos.
      */}
      <ItemForm
        key={item.version}
        initial={{
          name: item.name,
          description: item.description,
          condition: item.condition,
          category: item.category,
        }}
        submitLabel="Guardar cambios"
        pendingLabel="Guardando..."
        pending={update.isPending}
        error={conflict ? null : update.error}
        failureTitle="No se pudieron guardar los cambios"
        onSubmit={(values: ItemFormValues) =>
          update.mutate(
            { id: item.id, request: { ...values, version: item.version } },
            {
              onSuccess: (saved) =>
                navigate(routes.item(saved.id), {
                  replace: true,
                  state: flash('Los cambios quedaron guardados.'),
                }),
            },
          )
        }
        onCancel={() => navigate(routes.item(item.id))}
      />
    </Page>
  );
}

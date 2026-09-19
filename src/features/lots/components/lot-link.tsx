import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useLot } from '../hooks/use-lot';

/**
 * El lote al que pertenece un objeto, por su nombre.
 *
 * La ficha del objeto solo trae `lotId`: el catalogo no incrusta el lote dentro del objeto.
 * Asi que el nombre se pide aparte, y solo cuando hace falta, que es cuando el objeto esta
 * en un lote. Mientras llega se enseña el enlace con un texto neutro en vez de un hueco:
 * lo que importa es que hay un lote y se puede ir a verlo.
 */
export function LotLink({ lotId }: { lotId: string }) {
  const { data: lot } = useLot(lotId);

  return <Link to={routes.lot(lotId)}>{lot?.name ?? 'Ver el lote'}</Link>;
}

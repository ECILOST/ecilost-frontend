import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { useItem } from '@/features/catalog/hooks/use-item';
import { useLot } from '@/features/lots/hooks/use-lot';
import { AuctionableKind } from '../domain/room-status';
import type { RoundEntry } from '../model/room';

/**
 * El nombre de lo que va en una ronda.
 *
 * Auction solo guarda el identificador del catalogo, asi que el nombre se pide a catalog. Se
 * enlaza a la ficha porque es ahi donde el funcionario revisa fotos y estado, y si catalog no
 * responde se enseña el identificador en vez de dejar la fila en blanco.
 */
export function EntryName({ entry }: { entry: RoundEntry }) {
  const isItem = entry.kind === AuctionableKind.ITEM;
  const item = useItem(isItem ? entry.catalogId : '');
  const lot = useLot(isItem ? '' : entry.catalogId);
  const query = isItem ? item : lot;
  const to = isItem ? routes.item(entry.catalogId) : routes.lot(entry.catalogId);

  if (query.isPending) return <span>Cargando...</span>;

  return <Link to={to}>{query.data?.name ?? entry.catalogId}</Link>;
}

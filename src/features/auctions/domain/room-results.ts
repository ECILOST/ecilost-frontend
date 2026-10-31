import type { RoomSummary } from '../model/auction';

/**
 * Lo publico de una sala cerrada, igual para quien participo, quien la siguio desde afuera
 * y el funcionario: cuantos objetos se vendieron, cuantos quedaron desiertos y cuanto se
 * recaudo. No dice quien gano.
 */
export function publicTotals(
  rows: Array<Pick<RoomSummary['rows'][number], 'result' | 'finalPrice'>>,
): Pick<RoomSummary, 'sold' | 'deserted' | 'totalRaised'> {
  const sold = rows.filter((row) => row.result === 'AWARDED');
  return {
    sold: sold.length,
    deserted: rows.filter((row) => row.result === 'DESERTED').length,
    totalRaised: sold.reduce((total, row) => total + row.finalPrice, 0),
  };
}

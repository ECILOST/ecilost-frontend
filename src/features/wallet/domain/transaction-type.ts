import type { WalletTransactionType } from '../model/wallet';

/**
 * Como se lee cada movimiento desde el saldo disponible, que es el que decide si alcanza
 * para pujar: la reserva y el pago lo reducen, la emision, la recarga y la liberacion lo
 * aumentan. El pago sale de lo que ya estaba reservado, pero para quien lo lee es dinero
 * que se fue.
 */
export const TRANSACTION_TYPE: Record<
  WalletTransactionType,
  { label: string; sign: '+' | '−' }
> = {
  INITIAL_ISSUANCE: { label: 'Emisión inicial', sign: '+' },
  ADMIN_RECHARGE: { label: 'Recarga', sign: '+' },
  HOLD: { label: 'Reservado al pujar', sign: '−' },
  RELEASE: { label: 'Liberado', sign: '+' },
  DEBIT: { label: 'Pago de objeto ganado', sign: '−' },
};

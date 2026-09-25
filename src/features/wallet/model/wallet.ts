/**
 * Contratos de ecilost-wallet-service tal como viajan por la red.
 *
 * Los importes son **cadenas y no numeros**. En la base son `Decimal(18, 2)` y Prisma los
 * serializa como texto para no perder precision al pasarlos por un `double` de JavaScript.
 * Convertirlos a `number` aqui reintroduciria justo el problema que el servicio evito, asi
 * que se guardan como llegan y solo se convierten al escribirlos en pantalla.
 */

export interface Wallet {
  id: string;
  /** El `userId` que emite ecilost-auth-service. La billetera no conoce nombres ni correos. */
  userId: string;
  /** Lo que se puede gastar ahora mismo. */
  availableBalance: string;
  /**
   * Lo comprometido en pujas todavia sin resolver.
   *
   * Hoy siempre es cero: las operaciones que lo mueven (`HOLD`, `RELEASE`, `DEBIT`) estan
   * declaradas en el esquema pero no las produce ningun endpoint. Llegaran con las salas.
   */
  heldBalance: string;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de `POST /wallet/:userId/recharges`. Operacion de funcionario. */
export interface RechargeRequest {
  /** Positivo y con dos decimales como mucho. */
  amount: number;
  /**
   * Identificador de la operacion externa que origino la recarga.
   *
   * Es lo que hace la peticion repetible sin duplicar saldo: el servicio guarda la
   * referencia como unica, y una segunda recarga con la misma devuelve la primera en vez de
   * volver a sumar. Sin referencia, dos envios suman dos veces.
   */
  reference?: string;
}

export interface RechargeResult {
  wallet: Wallet;
  transaction: {
    id: string;
    type: string;
    amount: string;
    reference: string | null;
    createdAt: string;
  };
  /** Cierto cuando la referencia ya existia: no se sumo nada, se devolvio lo de antes. */
  replayed: boolean;
}

/** Tipos de movimiento, copiados del enum `WalletTransactionType` del servicio. */
export type WalletTransactionType =
  | 'INITIAL_ISSUANCE'
  | 'ADMIN_RECHARGE'
  | 'HOLD'
  | 'RELEASE'
  | 'DEBIT';

/** Una fila de `GET /wallet/me/transactions`. El importe llega como texto decimal. */
export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: string;
  createdAt: string;
}

/** Una pagina del historial, del movimiento mas reciente al mas antiguo. */
export interface WalletTransactionPage {
  items: WalletTransaction[];
  page: number;
  pageSize: number;
  total: number;
}

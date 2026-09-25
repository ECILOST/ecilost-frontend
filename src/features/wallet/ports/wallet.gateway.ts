import type {
  RechargeRequest,
  RechargeResult,
  Wallet,
  WalletTransactionPage,
} from '../model/wallet';

/**
 * Lo que la aplicacion necesita de la billetera, sin decir por donde llega.
 *
 * Leer la billetera propia y provisionarla son un solo caso de uso desde aqui ("mi
 * billetera"), y cual de las dos rutas hace falta lo decide el adaptador.
 */
export interface WalletGateway {
  /**
   * Mi billetera, provisionandola si es la primera vez.
   *
   * Se puede llamar cuantas veces haga falta: leer no escribe, y la emision inicial ocurre
   * una sola vez por cuenta.
   */
  mine(): Promise<Wallet>;

  /**
   * `POST /wallet/:userId/recharges`. Operacion de funcionario.
   *
   * El identificador es el `userId` que emite ecilost-auth-service, no un correo ni un
   * codigo institucional: la billetera no conoce ninguno de los dos.
   */
  recharge(userId: string, request: RechargeRequest): Promise<RechargeResult>;
  /**
   * `GET /wallet/me/transactions`. Mis movimientos, del mas reciente al mas antiguo: la
   * emision inicial, las recargas, lo que se reservo al pujar, lo que se libero y lo que se
   * pago al ganar.
   */
  transactions(page: number): Promise<WalletTransactionPage>;
}

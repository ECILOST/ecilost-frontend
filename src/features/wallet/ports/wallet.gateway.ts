import type { RechargeRequest, RechargeResult, Wallet } from '../model/wallet';

/**
 * Lo que la aplicacion necesita de la billetera, sin decir por donde llega.
 *
 * Son dos operaciones y no las tres rutas del servicio: leer la billetera propia y
 * provisionarla son un solo caso de uso desde aqui ("mi billetera"), y cual de las dos
 * rutas hace falta lo decide el adaptador.
 *
 * Lo que no hay es historial: el servicio guarda cada movimiento en su tabla, pero no
 * publica ningun endpoint que los devuelva.
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
}

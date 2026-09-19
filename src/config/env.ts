/**
 * Configuracion de la aplicacion, leida una sola vez y tipada, igual que el
 * `src/config/*.config.ts` de los servicios.
 *
 * Ningun otro archivo toca `import.meta.env`: asi una variable mal escrita se ve aqui y no
 * en la pantalla que la necesitaba, y cambiar de despliegue es cambiar un archivo.
 */
export interface AppConfig {
  readonly services: {
    /** ecilost-auth-service. Emite la sesion y el access token. */
    readonly auth: string;
    /** ecilost-catalog-service. Objetos, lotes y multimedia. */
    readonly catalog: string;
    /** ecilost-wallet-service. Saldo en ECICoin y recargas. */
    readonly wallet: string;
  };
}

/**
 * Por defecto apuntan al proxy de Vite y no a `localhost:3000`: la cookie de sesion es
 * httpOnly y de primera parte, y solo viaja si el navegador ve un mismo origen.
 *
 * La base de auth incluye el prefijo `/auth` porque asi se emite la cookie (`Path=/auth`),
 * de modo que un `/token` en el adaptador es el `POST /auth/token` del servicio.
 */
export const config: AppConfig = {
  services: {
    auth: import.meta.env.VITE_AUTH_BASE_URL ?? '/auth',
    catalog: import.meta.env.VITE_CATALOG_BASE_URL ?? '/api/catalog',
    wallet: import.meta.env.VITE_WALLET_BASE_URL ?? '/api/wallet',
  },
};

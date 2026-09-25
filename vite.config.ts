import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Fijo y no "el primero libre": ecilost-auth-service redirige aqui despues del login
    // (POST_LOGIN_REDIRECT_URL) y no puede adivinar que puerto eligio Vite.
    port: 5173,
    strictPort: true,

    /*
     * En desarrollo cada servicio corre en su propio puerto y ninguno habilita CORS, asi
     * que el navegador no puede llamarlos directo: el proxy los republica bajo el origen
     * de Vite. En produccion ese papel lo hara ecilost-api-gateway.
     */
    proxy: {
      /*
       * Sin reescribir el prefijo, a proposito. La cookie de sesion se emite con
       * `Path=/auth`, asi que solo viaja en peticiones cuya ruta empiece por ahi: servida
       * bajo `/api/auth` el navegador no la devolveria y el canje del token responderia
       * 401 sin motivo aparente.
       */
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },

      // Catalog solo usa `Authorization: Bearer`, sin cookies, asi que aqui el prefijo se
      // puede recortar.
      '/api/catalog': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/catalog/, ''),
      },

      /*
       * Wallet tampoco usa cookies, pero a diferencia de catalog si tiene prefijo propio:
       * `app.setGlobalPrefix('wallet')`. Por eso aqui no se recorta, se sustituye: lo que
       * el navegador pide como `/api/wallet/...` el servicio lo espera como `/wallet/...`.
       */
      '/api/wallet': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/wallet/, '/wallet'),
      },

      // Auction tampoco usa cookies ni prefijo global: sus rutas cuelgan de la raiz
      // (`/rooms`, `/rounds/:id/bids`), asi que el prefijo se recorta como en catalog.
      '/api/auction': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/auction/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}', 'test/**/*.spec.{ts,tsx}'],
  },
});

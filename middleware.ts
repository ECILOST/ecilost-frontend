import { next, rewrite } from '@vercel/functions';

/**
 * Routing Middleware de Vercel: el mismo papel que el proxy de `vite.config.ts` en
 * desarrollo. Los servicios no habilitan CORS y la cookie de sesion de auth-service es
 * httpOnly con `Path=/auth`, asi que el navegador tiene que verlos bajo el origen de la
 * aplicacion. Aqui cada prefijo se reenvia al servicio en Azure Container Apps.
 *
 * Los destinos salen de variables de entorno del proyecto de Vercel (no de `VITE_*`: nunca
 * llegan al navegador), de modo que el mismo codigo sirve para dev y prod.
 *
 * Socket.IO no pasa por aqui: Vercel no reenvia WebSockets. El cliente se conecta directo a
 * engagement con `VITE_REALTIME_URL`.
 */
interface ServiceRoute {
  /** Prefijo que pide el navegador. */
  readonly prefix: string;
  /** Variable de entorno con el origen del servicio. */
  readonly originEnv: string;
  /** Con que se reemplaza el prefijo en la ruta que recibe el servicio. */
  readonly replaceWith: string;
}

// Mismas reglas que `server.proxy` de vite.config.ts; ver alli el porque de cada una.
const SERVICE_ROUTES: readonly ServiceRoute[] = [
  { prefix: '/auth', originEnv: 'AUTH_SERVICE_URL', replaceWith: '/auth' },
  { prefix: '/api/catalog', originEnv: 'CATALOG_SERVICE_URL', replaceWith: '' },
  {
    prefix: '/api/wallet',
    originEnv: 'WALLET_SERVICE_URL',
    replaceWith: '/wallet',
  },
  { prefix: '/api/auction', originEnv: 'AUCTION_SERVICE_URL', replaceWith: '' },
  {
    prefix: '/api/engagement',
    originEnv: 'ENGAGEMENT_SERVICE_URL',
    replaceWith: '',
  },
];

export default function middleware(request: Request): Response {
  const url = new URL(request.url);

  for (const route of SERVICE_ROUTES) {
    const matches =
      url.pathname === route.prefix ||
      url.pathname.startsWith(`${route.prefix}/`);
    if (!matches) continue;

    const origin = process.env[route.originEnv];
    if (!origin) {
      return new Response(`${route.originEnv} no esta configurada en Vercel.`, {
        status: 502,
      });
    }

    const path = route.replaceWith + url.pathname.slice(route.prefix.length);
    return rewrite(new URL(`${path || '/'}${url.search}`, origin));
  }

  return next();
}

export const config = {
  matcher: ['/auth/:path*', '/api/:path*'],
};

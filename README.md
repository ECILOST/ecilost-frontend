# ecilost-frontend

Cliente web de **ECI Lost & Auction**. Auth emite la sesión, Catalog gestiona el inventario, Wallet administra Ecicoin y Auction controla las salas y las pujas. Engagement entrega notificaciones, chat, gamificación y eventos en vivo.

React 19 con Vite y TypeScript. El tooling es el mismo del back (vitest, oxlint, prettier)
para que un `npm test` signifique lo mismo en los dos lados.

## Puesta en marcha

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abre [la aplicación local](http://localhost:5173). Configura en Auth la URL de retorno del frontend y levanta los servicios de la tabla para probar el recorrido completo. Auth y Catalog cubren el inicio de sesión y la consulta de objetos. Wallet, Auction y Engagement completan el flujo de subastas.

### Por que todo pasa por el proxy de Vite

El proxy de Vite publica las rutas HTTP bajo el origen del frontend. La cookie `HttpOnly` usa `Path=/auth`, por lo que ese prefijo se conserva. Socket.IO comparte el origen local mediante `/socket.io`.

| Ruta del navegador | Servicio | Reescritura |
|---|---|---|
| `/auth/*` | Auth (3000) | Conserva `/auth` |
| `/api/catalog/*` | Catalog (3001) | Quita `/api/catalog` |
| `/api/wallet/*` | Wallet (3002) | Sustituye `/api/wallet` por `/wallet` |
| `/api/auction/*` | Auction (3003) | Quita `/api/auction` |
| `/api/engagement/*` | Engagement (3005) | Quita `/api/engagement` |
| `/socket.io` | Engagement (3005) | Conserva el path y habilita WebSocket |

Los contratos HTTP de Auth y Catalog están disponibles en [Auth Swagger](http://localhost:3000/docs) y [Catalog Swagger](http://localhost:3001/docs). Para Auction, Wallet y Engagement, consulta el contrato OpenAPI en el repositorio del servicio.

## Despliegue en Vercel

En Vercel el papel del proxy lo cumple `middleware.ts` (Routing Middleware), con las mismas
reglas de prefijos, y `vercel.json` sirve `index.html` para las rutas del `BrowserRouter`.
Hay un proyecto por ambiente: `ecilost-frontend-dev` y `ecilost-frontend` (prod).

Variables de cada proyecto (entorno *Production* del proyecto):

| Variable | Uso | Valor |
|---|---|---|
| `AUTH_SERVICE_URL` | destino de `/auth/*` (solo servidor) | URL del Container App de auth |
| `CATALOG_SERVICE_URL` | destino de `/api/catalog/*` | URL de catalog |
| `WALLET_SERVICE_URL` | destino de `/api/wallet/*` | URL de wallet |
| `AUCTION_SERVICE_URL` | destino de `/api/auction/*` | URL de auction |
| `ENGAGEMENT_SERVICE_URL` | destino de `/api/engagement/*` | URL de engagement |
| `VITE_REALTIME_URL` | Socket.IO directo (Vercel no reenvia WebSockets); se incrusta en el build | URL de engagement |

Las URLs las imprime `terraform output service_urls` en `ecilost-terraform/environments/<env>`.

## Estructura

Misma separacion que los servicios, con los nombres que usa una aplicacion de React. La tabla
completa y el paso a paso para agregar una feature estan en
[`docs/estructura.md`](docs/estructura.md).

```
src/
  main.tsx                 arranque, como el main.ts de los servicios
  app/
    container.ts           quien implementa cada puerto (el app.module.ts del front)
    providers/ router.tsx  cableado de React y mapa de rutas
    styles/                tokens y base global; lo demas son modulos CSS
  config/                  configuracion tipada, leida una sola vez
  shared/
    api/                   cliente HTTP, Problem Details, token en memoria
    components/ui/         piezas del sistema de diseño (boton, capsula, aviso, marco)
    components/shell/      marco de la aplicacion: marca, cabecera, navegacion
    guards/ format/        control de acceso y formateo
  features/<feature>/
    domain/                reglas y enums propios, sin React
    model/                 contratos con la API (los dto/ del servicio)
    ports/                 interfaces de lo que la feature necesita
    api/                   adaptadores HTTP que implementan esos puertos
    hooks/                 casos de uso para las pantallas
    components/            piezas de la feature
    pages/                 pantallas enrutadas
test/                      pruebas de integracion y dobles de los puertos
```

Los estilos siguen el mismo reparto: `app/styles/tokens.css` es el unico archivo con valores
crudos (color, radio, espacio, duracion) y cada componente lleva su `*.module.css` al lado,
de modo que borrar un componente borra sus estilos. La direccion de arte y el porque de cada
decision visual estan en [`docs/direccion-visual.md`](docs/direccion-visual.md).

Reglas de dependencia, que es lo que sostiene el reparto:

1. Una pantalla nunca llama a `fetch` ni a un adaptador: pide un hook.
2. Un hook nunca importa `api/`: pide su puerto al contenedor con `useContainer()`.
3. `domain/` y `model/` no importan React ni nada de `api/`.
4. Dentro de una feature los imports son relativos; entre features, siempre por `@/`.

Quien decide que adaptador implementa cada puerto es `src/app/container.ts`, el equivalente
de `app.module.ts`. Por eso una prueba monta la aplicacion entera con dobles sin tocar ni una
pantalla.

## Pruebas

```bash
npm test          # unitarias y de integracion
npm run lint
npm run typecheck
```

Las unitarias viven junto al codigo (`*.spec.ts`), como en los servicios. Las de integracion
estan en `test/` y montan la aplicacion real con los puertos sustituidos por dobles
(`test/helpers/fake-gateways.ts`), asi que ejercitan router, guards, sesion y pantalla sin
red y sin servidor.

## Estado

La aplicación incluye sesión con Google y acceso por capacidad, consulta y administración del inventario, lotes, billetera, programación de salas, subastas en vivo, chat y gamificación. El menú muestra las acciones asociadas al rol y cada servicio aplica sus propios permisos.

### Salas en vivo (HU-18, HU-19, HU-22, HU-23)

La sala la gobierna el reloj de `ecilost-auction-service`; la interfaz solo pinta y escucha:

- **Estado inicial** por HTTP (`GET /rooms/:id` y `GET /rooms/:id/state`), y despues cada
  evento del canal `/realtime` de engagement (`round.price`, `round.extended`,
  `round.activated`, `round.closed`, `room.status`) dispara una relectura. Al reconectar se
  relee todo; un sondeo lento cubre lo que se pierda.
- Cuando vence el JWT del handshake, Engagement cierra el socket. El cliente usa el JWT más reciente o pide recuperar la sesión. Al reconectar, restaura sala y chat y resincroniza el estado.
- **Contador**: `endsAt` del servidor corregido con `serverTime`. Llegar a cero no cierra nada;
  la ronda cambia cuando el servidor lo anuncia. Una extension anti-sniping mueve el contador al
  instante y muestra "Cierre extendido".
- **Sala de espera**: quien esta inscrito escucha el canal y entra a la sala en cuanto empieza.
- **Puja automatica**: `PUT /rounds/:id/auto-bid` con el limite; el panel muestra si esta
  activa o por que se detuvo (limite alcanzado o saldo insuficiente).
- **Sala terminada**: se muestra el resumen y desaparecen las acciones de puja; auction rechaza
  igual cualquier puja tardia.

## Cobertura y SonarQube

Ejecuta `npm ci` y luego `npm run test:cov` para generar `coverage/index.html` y
`coverage/lcov.info`. La cobertura corresponde a la suite que ejecuta `npm test`.
Vitest exige al menos un 80 % de cobertura global de líneas por repositorio.

El proyecto de SonarQube Cloud es `ECILOST_ecilost-frontend` en la organización `ecilost`.
Para importar LCOV, desactiva **Automatic Analysis** en **Administration > Analysis Method**.
Configura `SONAR_TOKEN` como secreto de GitHub Actions con permiso de análisis.
En cada push a la rama predeterminada, CI invoca `sonarcloud.yml` con el LCOV
generado por `npm run test:cov` y espera el resultado del Quality Gate.

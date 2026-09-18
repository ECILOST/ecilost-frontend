# ecilost-frontend

Cliente web de **ECI Lost & Auction**. Consume la API de los microservicios: la sesion la
emite `ecilost-auth-service` y el inventario lo sirve `ecilost-catalog-service`.

React 19 con Vite y TypeScript. El tooling es el mismo del back (vitest, oxlint, prettier)
para que un `npm test` signifique lo mismo en los dos lados.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
npm run dev
```

Queda en <http://localhost:5173>, que es el puerto que `ecilost-auth-service` tiene
configurado en `POST_LOGIN_REDIRECT_URL`. Necesita los dos servicios arriba: **auth en 3000**
y **catalog en 3001**. Sin ellos la aplicacion arranca igual, pero se queda en la pantalla de
entrada: el canje de la sesion responde 502 y no hay sesion que mostrar.

### Por que todo pasa por el proxy de Vite

Ningun servicio habilita CORS, y la cookie de sesion es `httpOnly` con `Path=/auth`. Las dos
cosas obligan a que el navegador vea un solo origen, asi que `vite.config.ts` republica los
servicios bajo el de la aplicacion:

| Ruta del navegador | Servicio | Reescritura |
|---|---|---|
| `/auth/*` | auth-service (3000) | ninguna, a proposito: la cookie solo viaja bajo `/auth` |
| `/api/catalog/*` | catalog-service (3001) | se recorta el prefijo |

Cuando exista `ecilost-api-gateway`, las dos variables de `.env` pasan a ser su URL publica y
el proxy deja de hacer falta.

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

Implementado de punta a punta: sesion con Google, guards por capacidad, catalogo de objetos
y ficha con multimedia (HU-08).

Pendiente, siguiendo la misma estructura: formulario de registro y edicion de objetos, subida
de multimedia (HU-07, el puerto y el adaptador ya estan en `features/media`), lotes, y las
salas de subasta cuando exista `ecilost-auction-service`.

# Estructura del frontend

Este documento explica **por que** las carpetas son estas y no otras, y como agregar una
feature sin romper el reparto.

## Equivalencias con los servicios

El back reparte cada modulo en capas (`domain/`, `dto/`, `ports/`, `repositories/`,
`*.service.ts`, `*.controller.ts`). El front hace lo mismo con los nombres de React:

| Servicio (NestJS) | Frontend (React) | Responsabilidad |
|---|---|---|
| `main.ts` | `src/main.tsx` | arrancar y construir las dependencias reales |
| `app.module.ts` | `src/app/container.ts` + `src/app/providers/` | decidir que implementacion recibe cada puerto |
| enrutado de controladores | `src/app/router.tsx` | que pantalla atiende cada direccion |
| `config/*.config.ts` | `src/config/env.ts` | configuracion tipada, leida una vez |
| `common/` | `src/shared/` | lo transversal, sin dueño de feature |
| `common/guards/` | `src/shared/guards/` | quien puede entrar |
| `common/http/problem-details.ts` | `src/shared/api/problem-details.ts` | contrato de error |
| `<f>/domain/` | `features/<f>/domain/` | reglas y enums, sin framework |
| `<f>/dto/` | `features/<f>/model/` | lo que viaja por la red |
| `<f>/ports/` | `features/<f>/ports/` | lo que la feature necesita, como interfaz |
| `<f>/repositories/` | `features/<f>/api/` | el adaptador que lo cumple (HTTP) |
| `<f>/*.service.ts` | `features/<f>/hooks/` | el caso de uso |
| `<f>/*.controller.ts` | `features/<f>/pages/` y `components/` | la capa de entrega |
| `test/` + `*.spec.ts` | `test/` + `*.spec.ts(x)` | integracion y unitarias |

Las diferencias reales, y su motivo:

- **No hay `entities/`.** El cliente no tiene entidades con invariantes: el dueño del estado
  es el servicio. Lo que aqui se llama `model/` son los contratos de la API.
- **`hooks/` hace de servicio.** Es donde vive el caso de uso y el manejo de cache, que en el
  back no existe porque alli la fuente de verdad es la base.
- **Las pruebas de pantalla sustituyen puertos, no la red.** El back tiene e2e con la base
  real; aqui el equivalente serian pruebas de navegador, que todavia no hay.

## El contenedor

`src/app/container.ts` construye un cliente HTTP por servicio y con ellos los adaptadores de
cada puerto. Es el unico archivo que conoce las implementaciones concretas.

```
config/env.ts ──> createHttpClient ──> createHttp<X>Gateway ──> Container
                                                                   │
                     ContainerProvider  <───────────────────────────
                            │
                     useContainer()  <── los hooks piden su puerto aqui
```

De ahi salen tres propiedades que no son gateways:

- `tokens`: el access token, **en memoria**. En `localStorage` lo leeria cualquier script de
  la pagina, y el token dura quince minutos justamente para no tener que guardarlo.
- `sessionLost`: por donde el cliente HTTP avisa de un 401. Sin ese canal, el cliente tendria
  que importar la sesion y la sesion al cliente.
- Los gateways de auth, catalog y media.

## Sesion

1. Al montar, `SessionProvider` llama a `POST /auth/token`: canjea la cookie por un access
   token y lo guarda en memoria.
2. Pregunta `GET /auth/me` y guarda las banderas de capacidad.
3. Programa la renovacion un minuto antes de que caduque.
4. Un 401 de cualquier servicio, o un canje fallido, dejan la sesion en `anonymous`.

**Nunca puede haber dos canjes en vuelo.** Cada canje rota el refresh token y el servicio
trata la presentacion de uno ya rotado como robo: revoca la cadena entera. Por eso
`createHttpAuthGateway` comparte la peticion en curso; sin eso, StrictMode en desarrollo
cerraria la sesion solo.

## Permisos

El menu y los guards se arman con las banderas de `GET /auth/me`
(`canManageCatalog`, `canScheduleRooms`, `canBid`), no con el rol. El servicio las publica
para eso: el dia que un rol nuevo administre el catalogo, el front no cambia.

Ocultar un boton no autoriza nada. La decision la toma cada servicio en su endpoint; aqui
solo se evita ofrecer pantallas que solo podrian responder 403.

## Agregar una feature

Con `wallet` como ejemplo:

1. `src/features/wallet/model/wallet.ts` — los contratos, calcados de los DTO del servicio.
   Las fechas son `string`: JSON no tiene fechas.
2. `src/features/wallet/domain/` — solo si hay reglas o enums propios (etiquetas, estados).
3. `src/features/wallet/ports/wallet.gateway.ts` — que necesita la feature, como interfaz.
4. `src/features/wallet/api/http-wallet.gateway.ts` — el adaptador contra el servicio.
5. `src/app/container.ts` — construirlo y agregarlo al `Container`.
6. `src/features/wallet/hooks/use-wallet.ts` — el caso de uso, con sus claves de cache.
7. `src/features/wallet/pages/` y `components/` — la pantalla.
8. `src/app/routes.ts` y `src/app/router.tsx` — la direccion y bajo que guard.
9. `test/helpers/fake-gateways.ts` — el doble del puerto, y la prueba en `test/`.

Si un paso se siente forzado, casi siempre es la señal de que la feature esta mal cortada:
las features se dividen por lo que hace el usuario, no por pantalla.

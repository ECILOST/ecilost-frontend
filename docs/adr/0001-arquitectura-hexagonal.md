# ADR-0001: Arquitectura hexagonal en el frontend

## Estado

Accepted. Aplica a todas las features (`auctions`, `auth`, `catalog`, `lots`, `media`, `rooms`,
`wallet`).

## Contexto

El frontend habla con cinco servicios (auth, catalog, auction, wallet y engagement), por HTTP y
por Socket.IO. Esos contratos cambian por historia de usuario, y algunas pantallas se construyeron
antes de que existiera su servicio. Hacían falta tres cosas: probar las pantallas sin levantar el
backend, tener un modo demo con rivales simulados y cambiar un servicio sin tocar las pantallas.
Con `fetch` dentro de los componentes, cada cambio de contrato se habría regado por toda la interfaz.

## Decisiones

1. **Puertos por feature.** `features/<f>/ports/` declara lo que la feature necesita
   (`AuctionGateway`, `WalletGateway`...) como interfaz de TypeScript, sin decir por dónde llega.
2. **Adaptadores aparte.** `features/<f>/api/` los cumple: `createHttp<X>Gateway` contra cada
   servicio, `createSocketRealtimeChannel` contra Engagement y `demo-auction.gateway` con rivales
   simulados. `lazy-auction.gateway` descarga el demo solo si se activa
   (`VITE_AUCTIONS_DEMO=true`), así que no pesa en el paquete de producción.
3. **Un único punto de composición.** `src/app/container.ts` es el equivalente de `app.module.ts`:
   el único archivo que conoce las implementaciones concretas. Los hooks piden su puerto con
   `useContainer()`.
4. **Dominio sin framework.** `features/<f>/domain/` guarda las reglas que el cliente necesita
   para mostrar (puja mínima, modalidades dinámicas) como funciones puras, probadas sin React.
5. **Casos de uso en hooks.** `features/<f>/hooks/` orquesta puerto, caché (TanStack Query) y
   estado. `pages/` y `components/` solo presentan.

## Alternativas descartadas

- **Organizar por tipo técnico** (`components/`, `services/`, `hooks/` globales): cada feature
  quedaría repartida en todo el árbol, y nada impediría que un componente llamara a la red.
- **Simular la red en las pruebas** (MSW): las pruebas quedarían atadas a URLs y formas de
  respuesta, no a lo que la pantalla necesita.

## Consecuencias

- Las pruebas montan la aplicación entera cambiando solo el contenedor
  (`test/helpers/render-app.tsx`, `fake-gateways.ts`) y corren en CI sin backend.
- Cuando cambia un contrato, se toca su adaptador y su `model/`. El puerto y las pantallas no
  cambian.
- El mismo mapa que el backend NestJS (`domain/`, `ports/`, adaptadores, módulo de composición)
  facilita pasar de un repositorio al otro.
- Costo: más archivos por feature y una interfaz que mantener aunque haya un solo adaptador.

## Evidencia

- `src/app/container.ts`: composición de los puertos.
- `src/features/auctions/ports/auction.gateway.ts` y `src/features/auctions/api/`: un puerto con
  adaptadores HTTP, demo y carga diferida.
- `docs/estructura.md`: equivalencias carpeta a carpeta con los servicios.
- `test/`: pruebas de pantalla con dobles de los puertos (`npm test`).

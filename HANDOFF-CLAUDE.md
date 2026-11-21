# Handoff: refactor frontend ECI Lost (continuar en otra conversación)

Pega este archivo (o di "lee HANDOFF-CLAUDE.md") en la nueva conversación de Claude Code, abierta en la carpeta `ecilost-frontend`.

## Reglas del proyecto (léelas primero)
- `CLAUDE.MD` y `.claude/agents/frontendagent.MD`: delegar TODO el trabajo de UI al `frontend-agent`, seguir sus reglas (10 heurísticas de Nielsen, errores amigables con capa central, mobile first, WCAG 2.2 AA, estados cargando/vacío/error/éxito/sin conexión) y pasar su checklist final antes de dar algo por terminado.
- También existe `src/.claude/agents/frontend-guardian.md` con convenciones.
- Stack: React 19 + Vite 8 + TypeScript + CSS Modules, react-router 7, @tanstack/react-query, socket.io. Componentes propios en `src/shared/components/ui`. Tokens en `src/app/styles/tokens.css`.
- Comandos: `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`. Modo demo para ver pantallas sin backend: `VITE_AUCTIONS_DEMO=true`.

## Pedido original del usuario (resumen fiel)
Refactorizar TODO el frontend, en este orden:
1. Responsive en todo, de 320 a 1920 px: sin scroll horizontal, sin textos cortados ni elementos encimados. Cada vista con sus estados: cargando, vacío, error, éxito y sin conexión.
2. Nueva paleta tomada de la imagen de referencia (catálogo "ECI LOST"):
   - Botones primarios en ámbar, con fondo y superficies beige.
   - Blobs de colores decorativos detrás de los objetos, sin competir con el contenido.
   - Tokens en un solo lugar y contraste AA.
   - Estados hover, focus, active y disabled.
3. Top bar ordenada:
   - Logo a la izquierda, navegación por prioridad y acciones de usuario a la derecha.
   - Eliminar la barra inferior en móvil y usar un drawer o hamburguesa: Esc, cierre al tocar fuera, foco accesible y objetivos táctiles de 44 px o más.
4. Landing como primera pantalla, antes del login:
   - Explica que es la plataforma de subastas en línea de la Escuela Colombiana de Ingeniería Julio Garavito, donde se subastan los objetos perdidos nunca reclamados.
   - Incluye hero con CTA, "cómo funciona", ejemplos de objetos y footer.
5. Login:
   - Botón con la G oficial de Google según su guía de marca.
   - Errores claros (cancelado, sin conexión, etc.), siempre con "Reintentar".

Al final el usuario quiere la checklist del frontend-agent y un resumen corto: qué cambió, qué archivos se tocaron, qué heurísticas de Nielsen se reforzaron y qué queda pendiente.

## YA HECHO (copiado a la carpeta; falta que el usuario haga commit)
Typecheck, lint, 315 tests y build en verde.
- **Paleta:**
  - `tokens.css` tiene tokens semánticos `--color-*` (primario ámbar #FBCB6E con texto #1F1A14, fondo beige #EFE6D6, superficie #F7F0E4, éxito, error, advertencia, foco #1E2A4A).
  - Se mantienen los alias `--eci-*`. Ojo: `--eci-cyan` ahora es ámbar.
  - Ya no hay colores crudos fuera de `tokens.css`, salvo la G de Google.
  - `src/app/styles/tokens.spec.ts` verifica el contraste AA.
  - Fuentes: Fredoka (display), Inter y Roboto 500 (para el botón de Google), todas vía `@fontsource`. **Hay que correr `npm install`.**
- **Botón (`shared/components/ui/button`):**
  - Prop `loading` (aria-busy, sin doble envío).
  - Hover solo con `(hover:hover)`, focus-visible con anillo y disabled con borde punteado.
- **Top bar (`shared/components/shell/*` y el nuevo `mobile-menu.tsx`):**
  - Desde 1024 px: logo, dos grupos de navegación, saldo, campana y menú de cuenta.
  - Por debajo: hamburguesa y drawer con trampa de foco, Esc, cierre con el velo, bloqueo de scroll y safe-area.
  - Se eliminó la bottom nav.
- **Landing (`src/features/landing/`):**
  - En `/` sin sesión, mediante `RequireAuth` con `anonymousHome`. Con sesión, `/` sigue llevando al inicio de cada rol.
  - Contiene hero, cómo funciona en 4 pasos, ejemplos ilustrados y footer.
- **Login:**
  - `google-sign-in-button.tsx` sigue la guía de marca.
  - `resolveLoginError` en `src/features/auth/domain/auth-error.ts` mapea los errores a mensajes humanos con reintentar.
  - El estado offline usa `src/shared/hooks/use-online.ts`.
  - `SessionProvider` marca `expired` cuando se pierde una sesión que existía.

## PENDIENTE (hacer en este orden)
1. **Decisión del usuario: el login acepta Gmail o cualquier cuenta de Google, NO solo la institucional.**
   - Cambia los textos de la landing y del login que piden `@escuelaing.edu.co` por "tu cuenta de Google".
   - Quita o ajusta el caso "correo no institucional" en `auth-error.ts` (`INSTITUTIONAL_DOMAINS`) y actualiza `auth-error.spec.ts` y `test/landing-page.spec.tsx`.
   - Revisa el paso 4 de "cómo funciona" en `landing.page.tsx`.
2. **Pase responsive y de estados por feature, con el frontend-agent** (se lanzó, pero no alcanzó a terminar; no se copió nada de esa fase). Divídelo por áreas:
   - **Compartidos, catálogo, lotes, media y pickups (`src/shared/**`, `src/features/{catalog,lots,media,pickups}`):**
     - Unificar `loading`, `empty-state`, `error-state`, `route-boundary`, `flash` y `notice`.
     - Crear un `Skeleton` compartido y un aviso global de "sin conexión" en el shell.
     - Arreglar `item-art` y `blob-frame`, que perdieron el turquesa porque `--eci-cyan` ahora es ámbar. Necesitan blobs multicolor, plato blanco y aspect-ratio fijo.
     - Pasar tablas a tarjetas en móvil.
     - `NotFound` lleva a `/items`; debe llevar a `/`.
   - **Subastas (`src/features/auctions/**`):**
     - El texto con degradado "nuevas historias" del inicio tiene bajo contraste.
     - Hay texto blanco sobre `--mode` o violeta en los modos dinámicos.
     - El botón "Pujar" naranja con degradado está fuera del sistema.
     - La sala en vivo debe manejar el modo sin conexión: avisar, deshabilitar pujar y reconectar.
     - Los diálogos deben caber en 320 px.
   - **Salas, gamificación, billetera y cuenta (`src/features/{rooms,gamification,wallet}`, `auth/components`):** responsive, estados, formularios accesibles y confirmación en acciones destructivas.
   - Se puede tomar como base `src/shared/api/error-messages.ts` para una capa central de mensajes de error; un agente lo empezó, pero no se copió.
3. **Docs:** actualizar "Contexto del proyecto" en `CLAUDE.MD` con el stack real y `docs/direccion-visual.md` a la paleta ámbar/beige (todavía describe el tema oscuro).
4. **Limitación conocida:** el login es una navegación completa a `/auth/google`. Si el servicio de auth está caído, el usuario ve la página de error del navegador. Solo los errores que vuelven en la URL se pueden mostrar de forma amigable.
5. Al terminar: checklist final del frontend-agent, capturas a 320/375/768/1280/1920 sin scroll horizontal (`scrollWidth > innerWidth`), typecheck, lint, tests y build en verde, y el resumen corto para el usuario.

## Limpieza en la carpeta
Se pueden borrar `.eci-transfer.tgz`, `.eci-parte1.tgz` y `.git/stale-index-lock-claude` (un lock viejo que se movió de sitio).

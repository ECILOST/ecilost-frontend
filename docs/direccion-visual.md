# Dirección visual de ECILOST

Análisis de la referencia (el catálogo "ECI LOST"), las reglas que salen de ella, cómo se
aplican a esta plataforma y el prompt maestro para generar pantallas nuevas.

La fuente de verdad de los valores es `src/app/styles/tokens.css`. Este documento explica el
**porqué** de cada regla y qué significa cada color; si algo aquí contradice a `tokens.css`,
manda `tokens.css` y hay que corregir este documento.

> Historia: hasta noviembre de 2026 la aplicación usaba un tema nocturno (fondo azul casi
> negro, cian como acción principal, luces difuminadas). Se reemplazó por el tema claro
> ámbar/beige de la referencia. Los nombres `--eci-*` de esa época se conservan como alias
> (ver B.1), pero el código nuevo usa los tokens semánticos `--color-*`.

---

## A. Qué hace funcionar la referencia

1. **Papel cálido, no pantalla oscura.** Fondo beige y tarjetas crema: se siente como un
   catálogo impreso del campus, cercano y nada corporativo.
2. **Un solo color de acción.** El ámbar marca lo que hay que pulsar. Todo lo demás es tinta
   casi negra sobre crema.
3. **El objeto se apoya en un plato blanco sobre manchas de color.** Dos o tres formas
   orgánicas planas y saturadas (violeta, turquesa, azul, rosa, amarillo) asoman por detrás
   y por las esquinas. Son decoración pura: nunca llevan texto encima.
4. **Formas variadas.** Conviven cápsulas, paneles de esquina muy redondeada y manchas
   asimétricas; la variedad da ritmo sin perder orden.
5. **Jerarquía por tamaño extremo.** Precio y reloj son tres o cuatro veces más grandes que
   el resto, en una tipografía redonda y pesada (Fredoka).
6. **Densidad baja arriba, alta abajo.** Una zona protagonista con aire y una zona de datos
   apretada debajo.

---

## B. Reglas reutilizables

### B.1 Color

Tokens semánticos (`--color-*`), los que debe usar todo código nuevo:

| Token | Valor | Trabajo |
|---|---|---|
| `--color-bg` | `#EFE6D6` | fondo de la aplicación (beige) |
| `--color-surface` | `#F7F0E4` | tarjetas y paneles |
| `--color-surface-raised` | `#FBF7EF` | panel destacado, diálogos |
| `--color-surface-sunken` | `#E6DDCF` | pistas, filtros inactivos, esqueletos |
| `--color-primary` | `#FBCB6E` | **acción principal** (incluido pujar), navegación activa |
| `--color-on-primary` | `#1F1A14` | texto sobre ámbar (11.4:1) |
| `--color-primary-text` | `#7A4F00` | ámbar como texto o icono sobre beige (5.8:1) |
| `--color-text` | `#1F1A14` | texto principal (13.9:1) |
| `--color-text-muted` | `#4D4337` | texto secundario (7.8:1) |
| `--color-text-subtle` | `#6B5F51` | metadatos (5.0:1, mínimo AA) |
| `--color-success` / `-bg` | `#1E6B47` / `#DCEFE2` | confirmación, **vas ganando**, **ganaste** |
| `--color-error` / `-bg` | `#B3311F` / `#F8DDD5` | errores, **te superaron** |
| `--color-warning` / `-bg` | `#7A5600` / `#FBE8BD` | advertencias, **sin conexión** |
| `--color-info` / `-bg` | `#2C55A8` / `#DDE6F7` | información |
| `--color-focus` | `#1E2A4A` | anillo de foco (≥ 9:1 sobre beige y sobre ámbar) |
| `--deco-*` | violeta, rosa, turquesa, azul, amarillo | **solo** manchas decorativas |

Reglas:

- **Ningún componente escribe un color crudo.** Todo sale de `tokens.css`. Única excepción:
  la G multicolor del botón de Google, fijada por su guía de marca.
- **Contraste AA verificado por test.** `src/app/styles/tokens.spec.ts` recalcula los ratios;
  si alguien cambia un color y rompe AA, la suite falla.
- **Nada de texto con degradado** (`background-clip: text`) sobre fondos claros: los tonos
  pastel no llegan a 4.5:1. Para acentuar un titular se usa el "resaltador" ámbar detrás de
  texto en tinta (ver `home.page.module.css`, `.accent`). La única excepción es el anuncio
  de modalidad, que va sobre el escenario oscuro (`--color-stage`).
- **Nada de texto blanco sobre rellenos de color claro** (ámbar, turquesa, coral, violeta):
  sobre ellos se escribe en tinta (`--color-text`). El blanco (`--color-on-strong`) solo va
  sobre error, éxito o info sólidos.
- **Las manchas (`--deco-*`) nunca usan el ámbar primario**: si los objetos tienen el color de
  los botones, dejan de distinguirse las acciones.
- El color nunca es el único portador de significado: siempre va con texto, icono o un borde
  distinto (por ejemplo, deshabilitado = atenuado **y** borde punteado).

Alias históricos `--eci-*`: se conservan para no reescribir cada módulo. Ojo con
**`--eci-cyan`, que ya no es cian: es el ámbar primario** (el nombre significa "acción
principal").

### B.2 Forma

- Radios: cápsula (`--r-chip`) para píldoras y botones; `--r-lg`/`--r-xl` para paneles;
  `--r-sm`/`--r-md` para piezas pequeñas.
- Manchas: tres radios orgánicos (`--blob-a/b/c/d`) y cuatro combinaciones de tres colores
  `--deco-*`, repartidas por hash del identificador del objeto (`blobSeed`, `artColors`): el
  catálogo se ve multicolor y cada objeto conserva sus colores entre visitas.
- El objeto (o su inicial, si no hay foto) va en un **plato blanco** con borde fino; las
  manchas son **planas**, sin desenfoque.
- Las alturas del arte son **proporciones** (`aspect-ratio`: 16/10 en tarjeta, 4/3 en ficha),
  no píxeles: el arte escala de 320 a 1920 px sin recortar el objeto.

### B.3 Tipografía

- **Fredoka** (variable) para titulares, marca y cifras; **Inter** (variable) para el texto
  corrido; **Roboto 500** solo en el botón de Google. Se sirven con `@fontsource` desde el
  propio paquete, sin CDN.
- Escala en `tokens.css` (`--text-2xs` … `--text-hero`); titulares grandes con `clamp()`.
- Cifras que cambian en vivo con `font-variant-numeric: tabular-nums`.

### B.4 Estados de interacción

Todos los controles tienen los cuatro, definidos en el componente y no en cada pantalla:

- **Hover** solo dentro de `@media (hover: hover)`: en táctil no existe.
- **Focus** con `:focus-visible`, un único anillo `--focus-ring` (3 px, azul noche).
- **Active**: el ámbar baja un tono (`--color-primary-active`) y pierde la sombra.
- **Disabled**: fondo `--color-disabled-bg`, texto 4.6:1 y **borde punteado**.
- **Cargando** (`<Button loading>`): `aria-busy`, spinner y protección contra doble envío.

### B.5 Movimiento

- Duraciones `--t-fast` (140 ms), `--t-med` (260 ms), `--t-slow` (480 ms); curvas
  `--ease-out` y `--ease-spring`.
- Todo se apaga con `prefers-reduced-motion` (regla global en `tokens.css`).

---

## C. Cómo se aplica a ECILOST

### C.1 Decisiones

| Decisión | Motivo |
|---|---|
| Ámbar para toda acción principal, **también pujar** | Un color = un significado (heurística #4). El antiguo botón coral con degradado estaba fuera del sistema y competía con el rojo de los errores; a "Pujar" lo distingue el icono del rayo y el tamaño |
| Verde para ganar, rojo para "te superaron" | Estados con color propio, siempre con texto |
| Amarillo/dorado para ECICoin y tiempo | Moneda interna de la universidad, sin estética cripto |
| Sin conexión en tono advertencia, no error | No es culpa de nadie ni algo roto; se avisa sin alarmar |
| Collage derivado del id del objeto | Multicolor pero estable: el objeto se reconoce por su color |

### C.2 Marco y navegación

- **Barra superior** (≥ 1024 px): logo a la izquierda, secciones agrupadas por prioridad en
  el centro, saldo, campana y menú de cuenta a la derecha.
- **Móvil y tablet** (< 1024 px): logo, campana y hamburguesa. El cajón lateral atrapa el
  foco, cierra con Esc y al tocar el velo, bloquea el scroll y respeta el notch. **No hay
  barra inferior.**
- **Aviso global de sin conexión** debajo de la barra (`OfflineBanner`): avisa sin bloquear y
  confirma unos segundos cuando vuelve la red.

### C.3 Estados de cada vista

Una sola familia de componentes, para que el mismo problema se vea igual en todas partes:

| Estado | Componente |
|---|---|
| Cargando | `<Loading skeleton="list|cards|detail">` (esqueleto con la forma final; los tres puntos solo para esperas pequeñas) |
| Vacío | `<EmptyState>` con explicación y acción |
| Error | `<ErrorState>`; el texto sale de la capa central `src/shared/api/error-messages.ts` y siempre ofrece "Reintentar" |
| Sin conexión | `OfflineBanner` global + `Notice tone="offline"` donde la acción queda en pausa (sala en vivo) |
| Éxito | `<Flash>` / `Notice tone="success"`, que se cierra con "Entendido" |
| Pantalla rota | `RouteBoundary` (error boundary por ruta) |
| 404 | `NotFound`, con salida al inicio |

Errores de inicio de sesión: `src/features/auth/domain/auth-error.ts`. Se admite **cualquier
cuenta de Google** (personal o de la Escuela); ningún texto pide un dominio concreto.

### C.4 Los estados de la subasta

| Estado | Color | Rótulo |
|---|---|---|
| Vas ganando | verde | "Vas ganando" junto al precio |
| Te superaron | rojo | "Te superaron" + nueva puja sugerida |
| Se extendió | amarillo | "Cierre extendido" junto al reloj |
| Sin conexión | advertencia | "Perdiste la conexión con la sala"; pujar queda deshabilitado y se refresca al volver |
| Saldo insuficiente | amarillo | cuánto hay, cuánto falta y qué hacer |

---

## D. Prompt maestro

> Para pegar en otra herramienta de diseño.

```text
Diseña ECILOST (ECI Lost & Auction), la plataforma de subastas en línea de la Escuela
Colombiana de Ingeniería Julio Garavito, donde se subastan los objetos perdidos que nadie
reclamó. Se paga con ECICoin, una moneda interna. Se entra con cualquier cuenta de Google.
Mobile-first, de 320 a 1920 px, sin scroll horizontal.

DIRECCIÓN ARTÍSTICA
Catálogo cálido impreso: fondo beige #EFE6D6, tarjetas crema #F7F0E4, texto en tinta casi
negra #1F1A14. Un solo color de acción: ámbar #FBCB6E con texto en tinta y borde ámbar
oscuro. Cada objeto se apoya en un plato blanco redondeado sobre dos o tres manchas
orgánicas planas y saturadas (violeta #A07CF0, rosa #EF6FAE, turquesa #4FD8B4, azul #5F8FF2,
amarillo #F6C544) que asoman por las esquinas; las manchas nunca llevan texto encima y nunca
usan el ámbar de los botones. Titulares y cifras en Fredoka, texto en Inter.

COLOR CON SIGNIFICADO
Ámbar = acción principal (incluido "Pujar"). Verde #1E6B47 = ganar. Rojo #B3311F = error y
"te superaron". Amarillo/dorado = ECICoin y tiempo. Advertencia #7A5600 = sin conexión.
Contraste AA en todo el texto; nada de texto con degradado ni texto blanco sobre colores
claros. El color nunca informa solo.

NAVEGACIÓN
Escritorio: barra superior con logo a la izquierda, secciones por prioridad y, a la derecha,
saldo, notificaciones y cuenta. Móvil: logo, campana y hamburguesa con cajón lateral (Esc,
cierre al tocar fuera, foco atrapado, objetivos de 44 px). Sin barra inferior.

PRIMERA PANTALLA (sin sesión)
Landing: qué es la plataforma, hero con CTA "Ingresar", cómo funciona en cuatro pasos,
ejemplos de objetos y footer. Login con el botón oficial "Continuar con Google" y errores
claros (cancelado, sin conexión, cuenta rechazada, sesión vencida) siempre con "Reintentar".

ESTADOS
Toda vista diseña cargando (esqueleto con la forma final), vacío (qué hacer), error (qué
pasó y "Reintentar"), éxito (confirmación que se puede cerrar) y sin conexión (aviso sin
bloquear; en la sala en vivo, pujar queda en pausa hasta que vuelva la red).

SALA EN VIVO
Objeto grande sobre su collage con el reloj en la esquina, precio en tamaño hero, estado del
usuario (vas ganando / te superaron), "Pujar N ECICoin" a todo el ancho en móvil, compra
inmediata en secundario, otra cantidad, puja automática, pujas recientes, chat y lo que
viene después. Confirmación con lo que queda de saldo antes de cada puja.

QUÉ EVITAR
Tema oscuro, estética fintech o cripto, degradados en los botones, texto sobre manchas,
alturas fijas en píxeles que recorten el objeto, hover como única vía de interacción.
```

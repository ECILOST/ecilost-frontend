# Dirección visual de ECILOST

Análisis de la referencia, reglas que se extraen de ella, cómo se traducen a esta plataforma
y el prompt maestro para generar el resto de pantallas.

La referencia es una **referencia de estilo, no una plantilla**. Lo que se conserva es el
lenguaje: fondo nocturno, color como energía, formas orgánicas, cifras enormes, contenido
recortado sobre manchas de color. Lo que cambia es todo lo que la ataba a otro producto.

---

## A. Qué hace funcionar la referencia

1. **Fondo nocturno, color como luz.** Casi negro azulado con manchas difuminadas detrás del
   contenido. El color no rellena cajas: ilumina desde atrás. Eso permite usar cinco colores
   saturados sin que la pantalla grite, porque solo brillan los acentos.
2. **El objeto está recortado, no fotografiado dentro de un marco.** Cada producto flota
   sobre una mancha irregular, con sombra propia y a veces desbordando su contenedor. Es la
   diferencia entre "una ficha de producto" y "una cosa que quiero mirar".
3. **Formas variadas, no un solo radio.** Conviven rectángulos de esquina muy redondeada,
   cápsulas, círculos y blobs asimétricos. Nada está alineado a una cuadrícula rígida, pero
   tampoco todo es una burbuja: la variedad es lo que da ritmo.
4. **Jerarquía por tamaño extremo, no por peso.** El precio y el reloj son tres o cuatro
   veces más grandes que el resto. Todo lo demás es deliberadamente pequeño. No hay tamaños
   intermedios compitiendo.
5. **Cifras con personalidad.** Números en una grotesca geométrica de peso alto, dentro de
   píldoras oscuras o con fondo de color. El número es un objeto gráfico, no texto.
6. **Los estados son pantallas, no mensajes.** "¡Vas ganando!", "¡Te superaron!" ocupan la
   pantalla entera, con un rótulo en cápsula, confeti y un color que se entiende antes de
   leer. El estado es la experiencia, no una notificación gris.
7. **Densidad baja arriba, alta abajo.** Cada pantalla tiene una zona protagonista con mucho
   aire y una zona de datos apretada (pujas recientes, historial). Ese contraste es lo que
   hace que el protagonista se lea como protagonista.
8. **Decoración intencionada.** Los confetis y garabatos aparecen en momentos emocionales
   (ganar, últimos segundos), nunca en las pantallas de trabajo. La diversión está
   dosificada.
9. **Navegación constante y discreta.** Barra inferior translúcida, siempre visible, con la
   acción central destacada. La navegación nunca compite con el contenido.
10. **Un color = un significado.** Rosa para pujar y para "en vivo", verde para ganar,
    amarillo para la moneda y el tiempo. El color informa antes que el texto.

### Lo que se descarta de la referencia

- **Tanto color por elemento.** En la referencia casi cada tarjeta lleva blobs. En una
  plataforma que se usa a diario eso cansa: aquí el color se concentra en el objeto y en el
  estado.
- **El brillo de "app de recompensas".** Los degradados fuertes en cada botón y las monedas
  con brillo empujan a fintech o a cripto. ECICoin es una moneda interna de una universidad.
- **Tipografía redonda de marketing.** Funciona en un splash, no en una tabla de pujas.

---

## B. Reglas reutilizables

### B.1 Color

Paleta propia, inspirada en la referencia pero con roles asignados. **Cada acento tiene un
trabajo**; si un color no significa nada, no se usa.

| Token | Valor | Trabajo |
|---|---|---|
| `--eci-void` | `#080B12` | fondo de la aplicación |
| `--eci-night` | `#0D121C` | barras y superficies translúcidas |
| `--eci-surface` | `#141B27` | tarjetas y paneles |
| `--eci-surface-high` | `#1B2433` | panel destacado (héroe, sala) |
| `--eci-text` | `#F2F5FA` | texto principal |
| `--eci-text-soft` | `#A7B1C2` | texto secundario |
| `--eci-text-dim` | `#7E8B9E` | metadatos y rótulos |
| `--eci-mint` | `#3BE8B0` | marca, confirmación, **vas ganando** |
| `--eci-coral` | `#FF4D6D` | **pujar**, en vivo, **te superaron** |
| `--eci-amber` | `#FFC53D` | **ECICoin** y **tiempo** |
| `--eci-blue` | `#4C6FFF` | información, lo que viene después |
| `--eci-violet` | `#9B6BFF` | celebración y decoración |

Reglas:

- Fondo oscuro siempre. No hay tema claro: la sala en vivo funciona como una transmisión y
  un tema claro obligaría a repintar la jerarquía entera.
- Cada acento tiene una versión translúcida al 14–16 % para rellenos de cápsula.
- Azul y violeta **como texto** usan variantes aclaradas (`#A7BAFF`, `#C3A6FF`): los puros no
  llegan a 4.5:1 sobre el fondo.
- El color nunca es el único portador de significado: siempre acompaña a texto o a un punto.

### B.2 Forma

- Radios: cápsula (`999px`) para píldoras y botones; `26–34px` para paneles grandes;
  `12–18px` para piezas pequeñas.
- **Tres radios orgánicos** (`--blob-a/b/c`) para las manchas y para recortar fotografías.
  Se reparten por hash del identificador del objeto: multicolor estable, no aleatorio.
- La mancha gira unos grados y la tarjeta no. Esa diferencia de ángulo es la que rompe la
  rejilla sin desordenarla.
- Superposición controlada: la etiqueta de estado monta sobre la imagen, el objeto desborda
  su mancha. Nunca más de dos capas superpuestas por pieza.

### B.3 Tipografía

- **Display: Space Grotesk** (600/700) para titulares, cifras, botones y píldoras.
- **Texto: Inter** (400/500) para descripciones y datos.
- Escala corta y con saltos grandes: `0.75 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.25 rem` y
  un tamaño *hero* `clamp(2.5rem, 8vw, 3.5rem)` reservado a precio y reloj.
- Todas las cifras que cambian en vivo: `font-variant-numeric: tabular-nums`. Sin esto el
  reloj tiembla al contar.
- Rótulos de sección en mayúsculas, 0.75rem, con `letter-spacing: 0.08em`.

### B.4 Imagen

- El objeto va recortado (`object-fit: contain`) sobre la mancha cuando la foto lo permite;
  una fotografía real se recorta **con** la forma orgánica (`object-fit: cover` + radio blob).
- Sin fotografía, la mancha con la inicial del objeto: el catálogo sigue viéndose como una
  colección de piezas y no como una lista de texto.
- Nada de marcos rectangulares con borde, ni sombras de catálogo de tienda.

### B.5 Movimiento

- Duraciones: `140ms` (respuesta al toque), `260ms` (entradas y cambios), `480ms` (splash).
- Curvas: `cubic-bezier(.22,1,.36,1)` para entradas; `cubic-bezier(.34,1.4,.64,1)` cuando
  algo debe sentirse elástico (la marca, la mancha al pasar por encima).
- Entrada escalonada de listas: 40 ms entre elementos, con tope a los seis primeros.
- Todo se apaga con `prefers-reduced-motion`, incluidas las animaciones de estado.

---

## C. Cómo se traduce a ECILOST

### C.1 Decisiones propias de esta plataforma

| Decisión | Motivo |
|---|---|
| Menta como color de marca, coral reservado a pujar | Si el color de la acción más importante se usa también en la marca, deja de avisar |
| ECICoin en ámbar, con tipografía de texto y no de cripto | Es una moneda interna de la universidad: se parece más a un crédito de cafetería que a un token |
| Sin tema claro | La sala en vivo es el centro del producto y funciona como transmisión |
| La mancha de color se deriva del id del objeto | El catálogo se ve multicolor y cada objeto conserva su color entre visitas |
| Estados con color **y** texto **y** punto | Daltonismo, y además el estado debe entenderse en una captura de pantalla |

### C.2 Los estados de la subasta

Cada uno tiene color, rótulo y una microinteracción. Ninguno es un `alert()`.

| Estado | Color | Rótulo | Movimiento |
|---|---|---|---|
| Vas ganando | menta | cápsula "Vas ganando" sobre el precio | el precio entra desde abajo, un pulso de menta |
| Te superaron | coral | cápsula "Te superaron" + precio nuevo | sacudida horizontal de 4 px, una sola vez |
| Se extendió | ámbar | "Tiempo extendido · +30 s" junto al reloj | el reloj se agranda un 6 % y vuelve |
| Últimos segundos | coral | reloj a tamaño hero | latido de 1 s por segundo restante, solo bajo 10 s |
| Ganaste | menta + violeta | pantalla completa, confeti | entrada elástica, confeti de 1.2 s que no se repite |
| Sala llena | neutro | panel con capacidad y puesto en cola | sin movimiento: es una espera, no una emoción |
| Saldo insuficiente | ámbar | cuánto falta, no solo "insuficiente" | el importe que falta entra con un pulso |

### C.3 Lo que ya está implementado en código

Este repositorio aplica la dirección a las pantallas que hoy tienen servicio detrás:

- **Entrada** (`/login`): splash con marca grande, blobs de fondo y una sola acción.
- **Catálogo** (`/items`): filtros en cápsula, tarjetas con mancha por objeto, contador
  de resultados, vacío con salida.
- **Ficha** (`/items/:id`): héroe con el objeto sobre la mancha, galería en zigzag, video
  con etiqueta, rastro administrativo solo si el servicio lo manda.
- **Salas** (`/rooms`): marcador de posición hasta que exista `ecilost-auction-service`.
- **Marco**: cabecera translúcida con marca, secciones y rol; barra inferior flotante en
  móvil; fondo de color fijo.
- **Estados**: cargando, error con Problem Details, vacío, sin permiso, 404.

Tres notas de implementación que condicionan el diseño:

1. **El listado no trae multimedia.** El servicio no firma URL en el listado, así que la
   tarjeta no puede apoyarse en una fotografía. De ahí la mancha con inicial. Si más
   adelante el catálogo publica una miniatura, la tarjeta ya tiene el hueco.
2. **Las URL de multimedia caducan a los quince minutos.** No se guardan en estado propio y
   la consulta de la ficha envejece antes de ese plazo.
3. **No hay precios ni ECICoin en la API todavía.** Nada de eso está inventado en la
   interfaz; el sistema de diseño ya reserva el tamaño *hero* y el ámbar para cuando exista.

---

## D. Prompt maestro

> Para pegar en otra herramienta de diseño. Describe la plataforma completa, no solo lo
> implementado.

```text
Diseña ECILOST (ECI Lost & Auction), una plataforma web universitaria donde los objetos
perdidos y no reclamados salen a subasta en vivo entre estudiantes, con una moneda interna
llamada ECICoin. Diseño mobile-first, también válido en escritorio.

CONCEPTO
El recorrido emocional es: objeto perdido → descubrimiento → subasta → tensión → puja →
ganador. La interfaz debe sentirse como una transmisión en vivo dentro de un campus, no como
una tienda ni como un panel de administración. Cercana, con energía, pero legible bajo
presión: alguien va a pujar con doce segundos en el reloj.

DIRECCIÓN ARTÍSTICA
Fondo nocturno azulado con manchas de color muy difuminadas y fijas detrás del contenido: el
color ilumina desde atrás, no rellena cajas. Los objetos se presentan recortados sobre
manchas orgánicas asimétricas, con sombra propia, desbordando ligeramente su contenedor.
Conviven rectángulos de esquina muy redondeada, cápsulas y blobs: nunca una sola forma
repetida. La decoración (confeti, destellos) aparece solo en momentos emocionales: ganar,
últimos segundos. En las pantallas de trabajo, cero adorno.

PALETA (fondo oscuro obligatorio, sin tema claro)
- Fondo: #080B12. Superficies: #141B27 y #1B2433. Barras translúcidas sobre #0D121C.
- Texto: #F2F5FA principal, #A7B1C2 secundario, #7E8B9E metadatos.
- Menta #3BE8B0: marca, confirmación, estado "vas ganando".
- Coral #FF4D6D: acción de pujar, indicador "en vivo", estado "te superaron".
- Ámbar #FFC53D: ECICoin y tiempo.
- Azul #4C6FFF: información y lo que viene después. Como texto, #A7BAFF.
- Violeta #9B6BFF: celebración y decoración. Como texto, #C3A6FF.
Cada acento tiene una versión al 14-16 % de opacidad para rellenos de cápsula. Un color =
un significado; el color nunca informa solo, siempre con texto o icono.

TIPOGRAFÍA
Space Grotesk (600/700) para titulares, cifras, botones y píldoras. Inter (400/500) para
texto corrido. Escala con saltos grandes y sin tamaños intermedios. Precio y reloj en tamaño
hero clamp(2.5rem, 8vw, 3.5rem), con cifras tabulares. Rótulos de sección en mayúsculas de
0.75rem con tracking 0.08em. El precio de la subasta es el elemento más grande de su
pantalla, siempre.

FORMA Y COMPOSICIÓN
Radios: cápsula para píldoras y botones; 26-34px para paneles; 12-18px para piezas pequeñas.
Tres radios orgánicos para manchas y recortes de fotografía, repartidos de forma estable por
objeto (mismo objeto, mismo color y forma siempre). La mancha gira unos grados y la tarjeta
no. Cada pantalla tiene una zona protagonista con mucho aire y una zona de datos apretada;
ese contraste es lo que crea la jerarquía.

NAVEGACIÓN
Móvil: barra inferior flotante translúcida con desenfoque, secciones con icono y etiqueta, la
activa marcada con color y un punto. Escritorio: cabecera fija translúcida con marca a la
izquierda, secciones en cápsula y estado de sesión a la derecha. Una sola lista de secciones
para las dos barras. Dentro de una sala, la navegación no desaparece pero cede protagonismo.

COMPONENTES
- Botones: primario (menta, relleno), pujar (coral con resplandor, solo en subasta),
  secundario (contorno), silencioso (fondo translúcido). Se hunden 1 px al pulsar.
- Cápsulas: etiqueta de estado, filtro, categoría, número de ronda. Misma pieza, distinto
  tono.
- Tarjeta de objeto: mancha de color con el objeto o su inicial, nombre en dos líneas como
  máximo, descripción recortada, categoría, estado físico y fecha.
- Marco de objeto: halo difuso + mancha sólida + objeto recortado encima.
- Reloj: cifras tabulares en panel oscuro; cambia a coral y late bajo diez segundos.
- Importe ECICoin: moneda circular ámbar + cifra en display + la palabra ECICoin. Nunca con
  aspecto de cripto: sin brillos metálicos, sin gráficas de mercado, sin ticker.
- Lista de pujas recientes: avatar, alias, importe, hace cuánto. Fila densa, la propia puja
  resaltada con borde menta.
- Avisos: un solo componente para vacío, error, sin permiso y 404; cambia el tono, no la
  forma. El error muestra lo que dijo el servidor, nunca "ocurrió un error".
- Notificaciones: lista con icono por tipo (te superaron, sala por empezar, ganaste,
  subasta extendida), hora relativa y enlace directo a la sala.

PANTALLA MÁS IMPORTANTE: SALA DE SUBASTA EN VIVO
Debe transmitir "está pasando ahora mismo". Jerarquía de arriba abajo:
1. Cabecera de sala: nombre, indicador "En vivo" en coral con punto latiendo, rondas como
   cápsulas numeradas (01 activa, 02 y 03 atenuadas) y participantes conectados.
2. El objeto en subasta, grande, sobre su mancha, con acceso a más fotografías y al video.
3. Precio actual en tamaño hero, con la siguiente puja indicada debajo en pequeño.
4. Reloj igual de grande que el precio, a su lado en escritorio y debajo en móvil.
5. Estado del usuario, en una franja que cambia de color: vas ganando (menta), te superaron
   (coral), sin pujar aún (neutro).
6. Acciones: "Pujar 460 ECICoin" (coral, ancho completo en móvil) y "Comprar ahora" cuando
   exista, en secundario para que no compita.
7. ECICoin: disponible y comprometido, siempre visibles, en una fila compacta.
8. Pujas recientes, con la nueva entrando desde arriba.
9. Al final: qué objeto viene después y en cuánto.
En móvil, precio, reloj y botón de pujar quedan fijos en la parte inferior mientras el resto
se desplaza: nunca hay que hacer scroll para pujar.

ESTADOS (pantallas, no mensajes)
- VAS GANANDO: franja menta, "Tu puja es la más alta", precio con pulso suave.
- TE SUPERARON: franja coral, cuánto se pujó por encima, botón para responder con la
  siguiente puja. Sacudida de 4 px, una sola vez.
- SE EXTENDIÓ: cápsula ámbar junto al reloj, "+30 s porque alguien pujó al final". Explica
  por qué pasó.
- ÚLTIMOS SEGUNDOS: reloj a tamaño máximo en coral, latido de un segundo, el resto de la
  pantalla se atenúa.
- GANASTE: pantalla completa, menta y violeta, confeti de 1.2 s sin repetición, precio final
  y dos salidas: ver detalles e ir a mis pujas.
- SALA LLENA: panel neutro con capacidad, puesto en la cola y aviso de cuándo se libera sitio.
  Sin decoración: es una espera.
- SALDO INSUFICIENTE: cuánto hay, cuánto hace falta y cuánto falta exactamente, con acción de
  recargar. Nunca solo "saldo insuficiente".

RONDAS
Una sala encadena varias rondas y los participantes no salen entre una y otra. La interfaz
debe responder en todo momento: dónde estoy, qué ronda está activa, qué objeto se subasta,
qué viene después y cuánto falta. El cambio de ronda se anuncia con una transición corta que
presenta el objeto siguiente; nada de recargar la pantalla entera sin aviso.

ECICOIN
Tres cifras siempre distinguibles: total, disponible y comprometido. Comprometido significa
retenido por pujas activas y hay que decirlo con esas palabras. Historial de movimientos con
signo y motivo. Recarga con importes sugeridos. Estética de moneda interna universitaria: sin
gráficas de precio, sin billetera cripto, sin brillos.

OTRAS PANTALLAS
Home con subasta destacada y próximas; catálogo con filtros en cápsula y buscador; ficha del
objeto con galería y video; sala de espera con cuenta atrás, objetos de la sala y aforo; mis
pujas con pestañas activas e historial y estado por fila (ganando, superado, ganada, perdida);
billetera; notificaciones; confirmación de "comprar ahora" con el importe que se descontará.

ANIMACIÓN
140 ms para la respuesta al toque, 260 ms para entradas y cambios, 480 ms para el splash.
Entradas escalonadas de 40 ms en listas, con tope. Una puja nueva entra desde arriba y
empuja a las demás. El precio cambia con un contador breve, no con un salto. El reloj solo
se anima bajo diez segundos. Nada se mueve de forma continua salvo el punto de "en vivo".
Todo se desactiva con prefers-reduced-motion.

RESPONSIVE
Móvil primero, 375 px de referencia. Sin scroll horizontal en ninguna pantalla. Columnas que
se apilan, filas de filtros que se deslizan, acciones críticas fijas abajo. En escritorio, un
ancho máximo de contenido de 1080 px centrado; la sala puede usar dos columnas (objeto a la
izquierda, precio, reloj y pujas a la derecha).

ACCESIBILIDAD
Contraste mínimo 4.5:1 en texto. Foco visible siempre, con un solo estilo de anillo. Objetivos
táctiles de 44 px. Los filtros y las pestañas son controles reales, no divs con onClick. El
estado del usuario se anuncia con regiones en vivo. Toda imagen con texto alternativo útil.
El color nunca es el único indicador.

HEURÍSTICAS DE NIELSEN, APLICADAS
- Visibilidad del estado: precio, reloj, ronda y si voy ganando, siempre a la vista.
- Feedback inmediato: la puja se refleja antes de que llegue la confirmación del servidor, y
  se corrige si el servidor la rechaza.
- Reconocer antes que recordar: la siguiente puja viene calculada, no hay que saber el
  incremento.
- Prevención de errores: el botón de pujar se desactiva sin saldo y explica por qué; comprar
  ahora pide confirmación con el importe.
- Consistencia: un color, un significado, en todas las pantallas.
- Lenguaje familiar: "te superaron", "vas ganando", "se extendió", no códigos ni jerga.
- Control del usuario: salir de una sala, cancelar una confirmación y volver atrás siempre
  disponibles.

QUÉ EVITAR
Nada de estética de dashboard empresarial, fintech, cripto, banca o SaaS. Nada de tarjetas
blancas sobre gris. Nada de convertir cada rectángulo en la misma burbuja redondeada. Nada
de degradados en todos los botones. Nada de iconos sin etiqueta en la navegación. Nada de
animaciones permanentes. Nada de inventar datos que la plataforma no tiene. Nada de que el
precio o el reloj compartan protagonismo con un banner. No debe parecer una plantilla
genérica: debe parecer ECILOST.
```

---

## Qué falta por diseñar cuando haya servicio

Sala de espera, sala en vivo, rondas, billetera ECICoin, mis pujas, notificaciones y
"comprar ahora". El sistema de diseño ya tiene las piezas (cápsulas, marco de objeto, avisos,
tamaño hero, tonos de estado); lo que falta es el dato, no el estilo.

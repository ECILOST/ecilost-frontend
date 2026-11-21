# Instrucciones del proyecto

## Agentes del proyecto

Este proyecto tiene un agente especializado en frontend, UX y UI definido en `.claude/agents/frontendagent.md` (nombre: `frontend-agent`).

### Cuándo delegar al `frontend-agent`
Delega SIEMPRE al `frontend-agent` cualquier tarea que toque la interfaz de usuario:
- Crear, modificar o refactorizar componentes, páginas o layouts.
- Formularios, validaciones y mensajes que ve el usuario.
- Estados de carga, vacío, error, éxito y sin conexión.
- Diseño responsive y adaptación a móvil, tablet y escritorio.
- Accesibilidad (WCAG), contraste, navegación por teclado.
- Estilos, tokens de diseño, temas y modo oscuro.
- Revisiones de usabilidad o auditorías heurísticas (Nielsen).

Si una tarea mezcla backend y frontend, resuelve tú la parte de backend (API, datos, lógica) y delega la parte visual y de interacción al `frontend-agent`, pasándole el contrato de datos (endpoints, tipos, posibles errores).

### Antes de dar por terminada cualquier pantalla
Pide al `frontend-agent` que pase su checklist final. Una vista no está lista si le faltan estados de carga, vacío o error, si no es responsive desde 320 px o si muestra errores técnicos al usuario.

## Estándares de UI que aplican a todo el proyecto

Aunque una tarea no se delegue, cualquier código que toque la UI debe respetar esto:

1. **Mobile first** y sin scroll horizontal a 320 px.
2. **Errores amigables:** nunca mostrar códigos HTTP, stack traces ni mensajes técnicos. Todo error dice qué pasó y qué puede hacer el usuario. Los errores técnicos se mapean a mensajes humanos en una capa central y el detalle se registra en consola o monitoreo, no en pantalla.
3. **Accesibilidad AA:** HTML semántico, labels visibles, foco visible, contraste suficiente.
4. **Consistencia:** reutilizar los componentes y tokens existentes antes de crear nuevos.
5. **Feedback inmediato:** toda acción del usuario tiene una respuesta visible (carga, éxito o error).

## Contexto del proyecto

<!-- Completa esta sección para que los agentes trabajen con tu stack real -->
- **Framework:** (ej. React 19 + Vite / Next.js 15 / Vue 3)
- **Estilos:** (ej. Tailwind CSS 4 / CSS Modules / styled-components)
- **Librería de componentes:** (ej. shadcn/ui / MUI / propia en `src/components/ui`)
- **Idioma de la interfaz:** español
- **Carpeta de componentes:** `src/components`
- **Tokens de diseño / tema:** (ruta del archivo de tema)
- **Comandos:**
    - Desarrollo: `npm run dev`
    - Lint: `npm run lint`
    - Tests: `npm test`
    - Build: `npm run build`
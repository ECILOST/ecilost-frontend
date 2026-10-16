import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Loading } from './loading';
import { Button } from './ui/button';
import { Notice } from './ui/notice';

/**
 * Lo que envuelve cada pantalla: la espera mientras llega su codigo (las rutas se cargan
 * por partes) y la red por si la pantalla falla al pintarse.
 *
 * Sin la red, un error de render en cualquier pantalla desmonta el arbol entero y deja la
 * aplicacion en blanco, sin menu ni forma de volver. Con ella, el marco sigue en pie y solo
 * la pantalla rota muestra el aviso.
 *
 * Quien la usa le pasa `resetKey` (la ruta): al navegar a otra pantalla el error se olvida.
 */
export function RouteBoundary({
  resetKey,
  children,
}: {
  resetKey: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary key={resetKey}>
      <Suspense fallback={<Loading label="Cargando la pantalla..." />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

interface State {
  error: Error | null;
}

/** React solo atrapa errores de render con un componente de clase. */
class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Aqui iria el envio a un servicio de monitoreo cuando el proyecto tenga uno.
    console.error('La pantalla fallo al pintarse', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // Tras un despliegue, los trozos de codigo viejos ya no existen: solo recargar lo arregla.
    const staleCode = isChunkLoadError(error);

    return (
      <Notice
        tone="alert"
        live="alert"
        title={
          staleCode
            ? 'Hay una versión nueva de ECILOST'
            : 'Esta pantalla tuvo un problema'
        }
        actions={
          staleCode ? (
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Recargar la página
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => this.setState({ error: null })}
            >
              Reintentar
            </Button>
          )
        }
      >
        {staleCode
          ? 'Recarga la página para seguir.'
          : 'El resto de la aplicación sigue funcionando. Vuelve a intentarlo o ve a otra sección.'}
      </Notice>
    );
  }
}

function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
    error.message,
  );
}

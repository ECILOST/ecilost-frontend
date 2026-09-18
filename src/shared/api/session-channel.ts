/**
 * Aviso de "esta sesion ya no vale" que va del cliente HTTP a quien la gobierna.
 *
 * Hace falta porque el 401 lo descubre cualquier peticion, de cualquier servicio, y quien
 * tiene que reaccionar es la sesion. Sin este canal el cliente HTTP tendria que importar la
 * sesion, y la sesion al cliente: una dependencia circular entre la capa transversal y una
 * feature.
 */
export interface SessionChannel {
  emit(): void;
  /** Devuelve la funcion para darse de baja, tal como espera un efecto de React. */
  subscribe(listener: () => void): () => void;
}

export function createSessionChannel(): SessionChannel {
  const listeners = new Set<() => void>();

  return {
    emit: () => listeners.forEach((listener) => listener()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

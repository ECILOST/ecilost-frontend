import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * Si el navegador cree tener red. `navigator.onLine` solo es fiable en negativo: `false`
 * seguro es sin conexion, `true` puede ser un wifi sin salida. Por eso se usa para avisar y
 * evitar un intento condenado, nunca para prometer que el siguiente funcionara.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

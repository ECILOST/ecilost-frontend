import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';
import { resetServerClock } from '@/shared/api/server-clock';

// Cada prueba monta su propio arbol. Sin esto el DOM de la anterior sigue ahi y una
// consulta por texto encuentra dos coincidencias que nadie puso juntas.
afterEach(cleanup);
// La hora del servidor es global: una prueba que la fija no debe mover las demas.
afterEach(resetServerClock);

// Las pantallas se cargan por partes (React.lazy). En las pruebas se cargan todas antes de
// empezar: si no, la primera compilacion de cada una compite con la espera de `findBy` y
// las pruebas fallan de forma intermitente segun la carga de la maquina.
beforeAll(async () => {
  await Promise.all(
    Object.values(import.meta.glob('/src/features/**/pages/**/*.tsx')).map(
      (load) => load(),
    ),
  );
});

/**
 * jsdom reconoce el elemento `<dialog>` pero no implementa `showModal()` ni `close()`.
 *
 * El apaño vive aqui y no dentro del componente a proposito: en un navegador de verdad esos
 * dos metodos si existen, y son justo los que atrapan el foco, apagan el resto de la pagina
 * para los lectores de pantalla y cierran con Escape. Escribir el componente para esquivar
 * el hueco de jsdom significaria renunciar a todo eso en produccion para que pase una
 * prueba.
 *
 * Lo que se repone es lo minimo que necesita el arbol: abrir, cerrar y avisar del cierre.
 * El foco y Escape no se simulan, asi que ninguna prueba debe darlos por probados aqui.
 */
if (typeof HTMLDialogElement !== 'undefined') {
  const prototype = HTMLDialogElement.prototype;

  if (!prototype.showModal) {
    prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  }

  if (!prototype.close) {
    prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  }
}

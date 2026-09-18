import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cada prueba monta su propio arbol. Sin esto el DOM de la anterior sigue ahi y una
// consulta por texto encuentra dos coincidencias que nadie puso juntas.
afterEach(cleanup);

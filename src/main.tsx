import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createContainer } from './app/container';
import { AppProviders } from './app/providers/app-providers';
import { createQueryClient } from './app/providers/query-client';
import { AppRouter } from './app/router';
import './app/styles/index.css';

// Arranque de la aplicacion, equivalente al `main.ts` de los servicios: aqui se construyen
// las dependencias reales y se monta el arbol. Es el unico archivo que hace las dos cosas.
const root = document.getElementById('root');
if (!root) throw new Error('Falta el <div id="root"> de index.html');

createRoot(root).render(
  <StrictMode>
    <AppProviders
      container={createContainer()}
      queryClient={createQueryClient()}
    >
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
);

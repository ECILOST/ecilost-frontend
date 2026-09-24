import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeItemGateway,
  createTestContainer,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/** El marco comun: quien esta dentro, a donde se puede ir y como se llega al contenido. */
describe('Marco de la aplicación', () => {
  it('dice de quien es la sesion, no solo que rol tiene', async () => {
    renderApp({
      route: '/items',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        items: createFakeItemGateway({ items: [] }),
      }),
    });

    // La cabecera solo muestra el avatar; nombre y rol estan a un clic, en su menu.
    await userEvent.click(
      await screen.findByRole('button', { name: 'Cuenta de Andrea Parra' }),
    );
    expect(screen.getByText('Andrea Parra')).toBeInTheDocument();
    expect(screen.getByText('Funcionario')).toBeInTheDocument();
  });

  it('ofrece saltar al contenido antes que recorrer el menu entero', async () => {
    renderApp({
      route: '/items',
      container: createTestContainer({
        auth: createFakeAuthGateway(STUDENT),
        items: createFakeItemGateway({ items: [] }),
      }),
    });

    const skip = await screen.findByRole('link', {
      name: /saltar al contenido/i,
    });
    expect(skip).toHaveAttribute('href', '#contenido');
    expect(document.getElementById('contenido')).not.toBeNull();
  });

  it('el menu se arma por capacidad, no por rol', async () => {
    const student = renderApp({
      route: '/items',
      container: createTestContainer({
        auth: createFakeAuthGateway(STUDENT),
        items: createFakeItemGateway({ items: [] }),
      }),
    });

    /*
      Subastas pide `canBid`, que solo tiene el estudiante. Se consulta en plural porque la
      misma lista se pinta dos veces, como pastillas arriba y como barra abajo: en el
      navegador solo una esta visible (`display: none` tambien la saca del arbol de
      accesibilidad), pero aqui no hay CSS aplicado y estan las dos.
    */
    expect(
      await screen.findAllByRole('link', { name: /subastas/i }),
    ).not.toHaveLength(0);
    student.unmount();

    renderApp({
      route: '/items',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        items: createFakeItemGateway({ items: [] }),
      }),
    });

    await screen.findByRole('heading', { name: 'Catálogo' });
    expect(
      screen.queryByRole('link', { name: /subastas/i }),
    ).not.toBeInTheDocument();
  });
});

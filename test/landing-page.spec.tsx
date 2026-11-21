import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  STUDENT,
  createFakeAuthGateway,
  createTestContainer,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/** La portada publica: lo que ve en `/` quien llega sin sesion. */
describe('Portada publica', () => {
  it('sin sesion, `/` presenta la plataforma en vez de rebotar al login', async () => {
    renderApp({
      route: '/',
      container: createTestContainer({ auth: createFakeAuthGateway(null) }),
    });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /objetos perdidos que nadie reclamó/i,
      }),
    ).toBeInTheDocument();
    // El nombre de la escuela va arriba del titulo y en el pie.
    expect(
      screen.getAllByText(/escuela colombiana de ingeniería julio garavito/i),
    ).toHaveLength(2);
  });

  it('la accion principal lleva al login y la secundaria explica como funciona', async () => {
    renderApp({
      route: '/',
      container: createTestContainer({ auth: createFakeAuthGateway(null) }),
    });

    const main = await screen.findByRole('main');
    const [ingresar] = within(main).getAllByRole('link', { name: 'Ingresar' });
    expect(ingresar).toHaveAttribute('href', '/login');
    expect(
      within(main).getByRole('link', { name: /ver cómo funciona/i }),
    ).toHaveAttribute('href', '#como-funciona');

    expect(
      screen.getByRole('heading', { name: /cuatro pasos/i }),
    ).toBeInTheDocument();
    // Los pasos son una secuencia: van en una lista ordenada.
    expect(main.querySelector('#como-funciona ol')?.children).toHaveLength(4);
  });

  it('ofrece saltar al contenido', async () => {
    renderApp({
      route: '/',
      container: createTestContainer({ auth: createFakeAuthGateway(null) }),
    });

    expect(
      await screen.findByRole('link', { name: /saltar al contenido/i }),
    ).toHaveAttribute('href', '#contenido');
  });

  it('con sesion, `/` sigue siendo el inicio de siempre', async () => {
    renderApp({
      route: '/',
      container: createTestContainer({ auth: createFakeAuthGateway(STUDENT) }),
    });

    expect(
      await screen.findByRole('button', { name: /abrir menú/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /objetos perdidos que nadie reclamó/i }),
    ).not.toBeInTheDocument();
  });
});

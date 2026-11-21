import { screen, within } from '@testing-library/react';
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
      misma lista puede estar en la barra de escritorio y en el cajon del movil; aqui no hay
      CSS aplicado, asi que no se da por hecho cuantas copias hay.
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

  it('ya no pinta una barra de navegacion inferior: en el movil hay un menu', async () => {
    renderApp({
      route: '/mis-pujas',
      container: createTestContainer({ auth: createFakeAuthGateway(STUDENT) }),
    });

    const toggle = await screen.findByRole('button', { name: 'Abrir menú' });
    // Una sola navegacion de secciones en el arbol mientras el cajon esta cerrado.
    expect(screen.getAllByRole('navigation', { name: 'Secciones' })).toHaveLength(1);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls');
  });

  it('el cajon se abre, marca la seccion actual y se cierra con Escape devolviendo el foco', async () => {
    const user = userEvent.setup();
    renderApp({
      route: '/mis-pujas',
      container: createTestContainer({ auth: createFakeAuthGateway(STUDENT) }),
    });

    const toggle = await screen.findByRole('button', { name: 'Abrir menú' });
    await user.click(toggle);

    const drawer = screen.getByRole('dialog', { name: 'Menú' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.getAttribute('aria-controls')).toBe(drawer.id);
    expect(drawer).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(within(drawer).getByRole('link', { name: 'Mis pujas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(drawer).getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('el foco no se escapa del cajon con Tab', async () => {
    const user = userEvent.setup();
    renderApp({
      route: '/mis-pujas',
      container: createTestContainer({ auth: createFakeAuthGateway(STUDENT) }),
    });

    await user.click(await screen.findByRole('button', { name: 'Abrir menú' }));
    const drawer = screen.getByRole('dialog', { name: 'Menú' });
    for (let index = 0; index < 15; index += 1) {
      await user.tab();
      expect(drawer).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('al elegir una seccion el cajon se cierra y se navega', async () => {
    const user = userEvent.setup();
    renderApp({
      route: '/mis-pujas',
      container: createTestContainer({ auth: createFakeAuthGateway(STUDENT) }),
    });

    await user.click(await screen.findByRole('button', { name: 'Abrir menú' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'Top semanal' }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Top semanal', current: 'page' }),
    ).toBeInTheDocument();
  });
});

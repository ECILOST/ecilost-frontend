import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteBoundary } from './route-boundary';

let broken = true;
function Flaky() {
  if (broken) throw new Error('fallo al pintar');
  return <p>pantalla lista</p>;
}

describe('RouteBoundary', () => {
  beforeEach(() => {
    broken = true;
    // React registra el error atrapado en consola; aqui es lo esperado.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('una pantalla que falla muestra el aviso en vez de dejar la aplicacion en blanco', async () => {
    render(
      <RouteBoundary resetKey="/a">
        <Flaky />
      </RouteBoundary>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /esta pantalla tuvo un problema/i,
    );

    broken = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('pantalla lista')).toBeInTheDocument();
  });

  it('al cambiar de ruta el error se olvida', async () => {
    const { rerender } = render(
      <RouteBoundary resetKey="/a">
        <Flaky />
      </RouteBoundary>,
    );
    await screen.findByRole('alert');

    broken = false;
    rerender(
      <RouteBoundary resetKey="/b">
        <Flaky />
      </RouteBoundary>,
    );

    expect(await screen.findByText('pantalla lista')).toBeInTheDocument();
  });

  it('si falta el codigo de una version anterior, ofrece recargar', async () => {
    function Stale(): never {
      throw new TypeError(
        'Failed to fetch dynamically imported module: /assets/room.js',
      );
    }
    render(
      <RouteBoundary resetKey="/a">
        <Stale />
      </RouteBoundary>,
    );

    expect(
      await screen.findByRole('button', { name: 'Recargar la página' }),
    ).toBeInTheDocument();
  });
});

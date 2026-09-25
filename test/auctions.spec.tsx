import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeWalletGateway,
  createTestContainer,
  walletFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Pantallas de subasta sobre el adaptador de demostracion (sin rivales ni reloj propio).
 * Las salas de la semilla: 04 en curso con la persona dentro, 07 en curso sin ella, 05
 * programada y 02 cerrada.
 */
function student(availableBalance = '950.00') {
  return createTestContainer({
    auth: createFakeAuthGateway(STUDENT),
    wallet: createFakeWalletGateway({
      wallet: walletFixture({ availableBalance }),
    }),
  });
}

describe('Subastas', () => {
  it('la portada destaca lo que esta en vivo y lista lo proximo', async () => {
    renderApp({ route: '/', container: student() });

    expect(
      await screen.findByRole('heading', { name: 'Mochila negra' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Próximas subastas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver subastas/i })).toHaveAttribute(
      'href',
      '/subastas',
    );
  });

  it('el catalogo filtra por estado y busca sin importar tildes', async () => {
    renderApp({ route: '/subastas', container: student() });

    const name = (text: string) =>
      screen.queryByRole('heading', { name: text });
    await screen.findByRole('heading', { name: 'Calculadora Casio' });
    await userEvent.click(screen.getByRole('button', { name: 'En vivo' }));
    expect(name('Mochila negra')).toBeInTheDocument();
    expect(name('Calculadora Casio')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    await userEvent.type(
      screen.getByRole('searchbox', { name: /buscar/i }),
      'audifonos',
    );
    expect(name('Audífonos Sony')).toBeInTheDocument();
    expect(name('Mochila negra')).not.toBeInTheDocument();
  });

  it('pujar pide confirmacion con el saldo que queda y luego avisa que vas ganando', async () => {
    renderApp({ route: '/salas/sala-04', container: student('950.00') });

    await userEvent.click(
      await screen.findByRole('button', { name: /pujar 480 ecicoin/i }),
    );
    const confirm = await screen.findByRole('dialog', {
      name: 'Confirmar puja',
    });
    expect(confirm).toHaveTextContent('480 ECICoin');
    expect(confirm).toHaveTextContent('470 ECICoin');

    await userEvent.click(
      within(confirm).getByRole('button', { name: /confirmar puja/i }),
    );
    expect(
      await screen.findByRole('dialog', { name: '¡Vas ganando!' }),
    ).toBeInTheDocument();
  });

  it('deja pujar una cantidad exacta, pero no por debajo de la minima', async () => {
    renderApp({ route: '/salas/sala-04', container: student('950.00') });

    const amount = await screen.findByLabelText(/otra cantidad/i);
    await userEvent.type(amount, '479');
    await userEvent.click(
      screen.getByRole('button', { name: /pujar esta cantidad/i }),
    );
    expect(amount).toHaveAccessibleDescription(/al menos 480 ECICoin/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.clear(amount);
    await userEvent.type(amount, '725');
    await userEvent.click(
      screen.getByRole('button', { name: /pujar esta cantidad/i }),
    );
    const confirm = await screen.findByRole('dialog', {
      name: 'Confirmar puja',
    });
    expect(confirm).toHaveTextContent('725 ECICoin');
  });

  it('sin saldo suficiente dice cuanto falta en lugar de enviar la puja', async () => {
    renderApp({ route: '/salas/sala-04', container: student('350.00') });

    await userEvent.click(
      await screen.findByRole('button', { name: /pujar 480 ecicoin/i }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Saldo insuficiente',
    });
    expect(dialog).toHaveTextContent('Te faltan');
    expect(dialog).toHaveTextContent('130 ECICoin');
    expect(
      within(dialog).getByRole('link', { name: 'Recargar ECICoin' }),
    ).toHaveAttribute('href', '/billetera');
  });

  it('quien no entro antes del inicio solo sigue la sala, sin boton de pujar', async () => {
    renderApp({ route: '/salas/sala-07', container: student() });

    expect(
      await screen.findByText(
        'El ingreso a esta sala cerró al iniciar la subasta',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Reloj inteligente', { selector: 'h2' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /pujar/i }),
    ).not.toBeInTheDocument();
  });

  it('en la sala de espera se puede unir antes del inicio', async () => {
    renderApp({ route: '/salas/sala-05', container: student() });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Unirme a la sala' }),
    );
    expect(
      await screen.findByRole('button', { name: /ya estás dentro/i }),
    ).toBeDisabled();
    expect(screen.getByText('33/40')).toBeInTheDocument();
  });

  it('al cerrar la sala resume lo ganado, lo perdido y lo gastado', async () => {
    renderApp({ route: '/salas/sala-02', container: student() });

    expect(
      await screen.findByRole('heading', { name: 'La sala finalizó' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Total gastado en la sala')).toBeInTheDocument();
    expect(screen.getByText('1.220')).toBeInTheDocument();
  });

  it('mis pujas separa las activas del historial', async () => {
    renderApp({ route: '/mis-pujas', container: student() });

    expect(await screen.findByText('Mochila negra')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Historial' }));
    expect(await screen.findByText('Mochila Totto')).toBeInTheDocument();
    expect(screen.queryByText('Mochila negra')).not.toBeInTheDocument();
  });

  it('las notificaciones se marcan como leidas y la campana deja de avisar', async () => {
    renderApp({ route: '/notificaciones', container: student() });

    expect(
      await screen.findByRole('link', { name: /notificaciones, 2 sin leer/i }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar todas como leídas' }),
    );
    expect(
      await screen.findByRole('link', { name: 'Notificaciones' }),
    ).toBeInTheDocument();
  });

  it('un funcionario no entra a las pantallas de subasta: no puja', async () => {
    renderApp({
      route: '/subastas',
      container: createTestContainer({ auth: createFakeAuthGateway(STAFF) }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /solo los estudiantes pujan/i,
    );
  });
});

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { RechargeRequest } from '@/features/wallet/model/wallet';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import {
  DIRECTORY,
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeItemGateway,
  createFakeWalletGateway,
  createTestContainer,
  walletFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Billetera (ECICoin).
 *
 * Lo que hay que fijar aqui es que el saldo solo se pide a quien puja, que la recarga pasa
 * por encontrar antes a la persona, y que una recarga repetida se distingue de una que si
 * abono: son las tres cosas que el servicio resuelve de una forma poco evidente.
 */

const ESTUDIANTE = DIRECTORY['estudiante@escuelaing.edu.co'];

/** Busca a la persona y escribe la cantidad. Es el camino entero hasta el boton de abonar. */
async function prepararRecarga(
  correo = ESTUDIANTE.email,
  cantidad = '50000',
): Promise<void> {
  await userEvent.type(await screen.findByLabelText(/correo/i), correo);
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

  await screen.findByText(correo);
  await userEvent.type(screen.getByLabelText(/^cantidad/i), cantidad);
}

describe('Billetera', () => {
  it('el estudiante ve su saldo en la cabecera', async () => {
    renderApp({
      route: '/items',
      container: createTestContainer({
        auth: createFakeAuthGateway(STUDENT),
        items: createFakeItemGateway({ items: [] }),
        wallet: createFakeWalletGateway({
          wallet: walletFixture({ availableBalance: '150000.00' }),
        }),
      }),
    });

    // En la cabecera la cifra va como en el diseño, sin decimales si no los tiene.
    expect(await screen.findByText('150.000')).toBeInTheDocument();
  });

  it('al funcionario no se le abre billetera: no puja', async () => {
    let consultada = false;
    const wallet = createFakeWalletGateway();
    const espia = {
      ...wallet,
      mine: () => {
        consultada = true;
        return wallet.mine();
      },
    };

    renderApp({
      route: '/items',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        items: createFakeItemGateway({ items: [] }),
        wallet: espia,
      }),
    });

    await screen.findByRole('heading', { name: 'Catálogo' });
    expect(consultada).toBe(false);
    expect(screen.queryByText(/150.000/)).not.toBeInTheDocument();
  });

  it('recarga contra el userId que devolvio la busqueda, no contra el correo', async () => {
    const recharges: { userId: string; request: RechargeRequest }[] = [];
    renderApp({
      route: '/wallet/recargar',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        wallet: createFakeWalletGateway({
          recharges,
          wallet: walletFixture({ availableBalance: '200000.00' }),
        }),
      }),
    });

    await prepararRecarga();
    // La persona se queda a la vista mientras se decide cuanto abonarle. Se comprueba por
    // el correo y no por el nombre porque el nombre tambien esta en el dialogo, que sigue
    // en el DOM aunque este cerrado.
    expect(screen.getByText(ESTUDIANTE.email)).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText(/referencia/i),
      'consignacion-001',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abonar' }));

    const dialog = await screen.findByRole('dialog', {
      name: /¿abonar esta cantidad\?/i,
    });
    expect(dialog).toHaveTextContent('50.000,00');
    expect(dialog).toHaveTextContent(ESTUDIANTE.fullName);
    expect(recharges).toEqual([]);

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Abonar' }),
    );

    // Lo que viaja es el identificador, que es lo unico que la billetera entiende.
    expect(recharges).toEqual([
      {
        userId: ESTUDIANTE.userId,
        request: { amount: 50000, reference: 'consignacion-001' },
      },
    ]);
    expect(await screen.findByText(/recarga abonada/i)).toBeInTheDocument();
    expect(screen.getByText('200.000,00')).toBeInTheDocument();
  });

  it('un correo sin cuenta se explica, y no llega a pedir la cantidad', async () => {
    renderApp({
      route: '/wallet/recargar',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        wallet: createFakeWalletGateway(),
      }),
    });

    await userEvent.type(
      await screen.findByLabelText(/correo/i),
      'nadie@escuelaing.edu.co',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no hay ninguna cuenta con ese correo/i,
    );
    expect(screen.queryByLabelText(/^cantidad/i)).not.toBeInTheDocument();
  });

  it('avisa cuando la cuenta encontrada esta inactiva', async () => {
    renderApp({
      route: '/wallet/recargar',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        wallet: createFakeWalletGateway(),
      }),
    });

    await userEvent.type(
      await screen.findByLabelText(/correo/i),
      'suspendida@escuelaing.edu.co',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(
      await screen.findByText(/esta cuenta está inactiva/i),
    ).toBeInTheDocument();
    // Se avisa, pero no se bloquea: la billetera lo acepta y no toca inventar una regla.
    expect(screen.getByLabelText(/^cantidad/i)).toBeInTheDocument();
  });

  it('rechaza una cantidad que el servicio no aceptaria, sin gastar la peticion', async () => {
    const recharges: { userId: string; request: RechargeRequest }[] = [];
    renderApp({
      route: '/wallet/recargar',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        wallet: createFakeWalletGateway({ recharges }),
      }),
    });

    // Tres decimales: el servicio admite dos.
    await prepararRecarga(ESTUDIANTE.email, '10.005');
    await userEvent.click(screen.getByRole('button', { name: 'Abonar' }));

    expect(recharges).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^cantidad/i)).toHaveAccessibleDescription(
      /dos decimales como máximo/i,
    );
  });

  it('una referencia repetida no abona de nuevo, y se dice', async () => {
    renderApp({
      route: '/wallet/recargar',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        wallet: createFakeWalletGateway({ replayed: true }),
      }),
    });

    await prepararRecarga();
    await userEvent.click(screen.getByRole('button', { name: 'Abonar' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Abonar' }),
    );

    expect(await screen.findByText(/no se abonó nada/i)).toBeInTheDocument();
  });

  it('distingue "no tiene cuenta" de "tiene cuenta pero nunca entro"', async () => {
    renderApp({
      route: '/wallet/recargar',
      container: createTestContainer({
        auth: createFakeAuthGateway(STAFF),
        wallet: createFakeWalletGateway({
          rejects: {
            recharge: new ApiError({
              type: ProblemType.WALLET_NOT_FOUND,
              title: 'El recurso no existe',
              status: 404,
            }),
          },
        }),
      }),
    });

    await prepararRecarga();
    await userEvent.click(screen.getByRole('button', { name: 'Abonar' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Abonar' }),
    );

    expect(
      await screen.findByText(/todavía no tiene billetera/i),
    ).toBeInTheDocument();
  });

  it('al estudiante no le deja entrar a recargar', async () => {
    renderApp({
      route: '/wallet/recargar',
      container: createTestContainer({
        auth: createFakeAuthGateway(STUDENT),
      }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no tienes permiso/i,
    );
  });
});

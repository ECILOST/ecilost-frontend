import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ItemStatus } from '@/features/catalog/domain/item-status';
import type { ScheduleRoomRequest } from '@/features/rooms/model/room';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import {
  STAFF,
  STUDENT,
  createFakeAuthGateway,
  createFakeItemGateway,
  createFakeLotGateway,
  createFakeRoomGateway,
  createTestContainer,
  detailFixture,
  itemFixture,
  lotFixture,
  roomFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Programar salas (HU-15), desde el lado del funcionario.
 *
 * Lo que hay que probar es el contrato con auction: una entrada por ronda, el precio minimo
 * entero, y que un 409 signifique que no se programo nada.
 */

const AVAILABLE = [
  itemFixture({ id: 'item-1', name: 'Portatil Lenovo' }),
  itemFixture({ id: 'item-2', name: 'Audifonos Sony' }),
];

function staff(overrides: Parameters<typeof createTestContainer>[0] = {}) {
  return createTestContainer({
    auth: createFakeAuthGateway(STAFF),
    items: createFakeItemGateway({
      items: AVAILABLE,
      views: { 'item-1': detailFixture({ id: 'item-1', name: 'Portatil Lenovo' }) },
    }),
    lots: createFakeLotGateway({ lots: [lotFixture({ id: 'lot-1' })] }),
    ...overrides,
  });
}

async function fillRoom() {
  await userEvent.type(
    await screen.findByLabelText(/nombre de la sala/i),
    'Subasta de octubre',
  );
  fireEvent.change(screen.getByLabelText(/^inicio/i), {
    target: { value: '2030-10-01T16:00' },
  });
  await userEvent.type(screen.getByLabelText(/aforo máximo/i), '25');
  await userEvent.selectOptions(
    screen.getByLabelText(/objeto o lote de la ronda 1/i),
    'ITEM:item-1',
  );
  await userEvent.type(screen.getByLabelText(/precio mínimo/i), '50000');
}

describe('Salas del funcionario', () => {
  it('lista las salas con su inicio y su cupo', async () => {
    renderApp({
      route: '/programacion',
      container: staff({
        rooms: createFakeRoomGateway({ rooms: [roomFixture()] }),
      }),
    });

    expect(
      await screen.findByRole('heading', { name: 'Subasta de electrónica' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 ronda · 4 de 30 cupos ocupados/)).toBeInTheDocument();
  });

  it('un estudiante no puede programar salas', async () => {
    renderApp({
      route: '/programacion/nueva',
      container: createTestContainer({ auth: createFakeAuthGateway(STUDENT) }),
    });

    expect(
      await screen.findByText(/programar salas es una operación de funcionario/i),
    ).toBeInTheDocument();
  });

  it('ofrece objetos disponibles y lotes activos, y no deja repetir uno en otra ronda', async () => {
    renderApp({ route: '/programacion/nueva', container: staff() });

    const first = await screen.findByLabelText(/objeto o lote de la ronda 1/i);
    expect(within(first).getByRole('option', { name: /portatil lenovo/i })).toBeInTheDocument();
    expect(
      within(first).getByRole('option', { name: /kit de electronica extraviada/i }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(first, 'ITEM:item-1');
    await userEvent.click(screen.getByRole('button', { name: /añadir ronda/i }));

    const second = screen.getByLabelText(/objeto o lote de la ronda 2/i);
    expect(
      within(second).getByRole('option', { name: /portatil lenovo/i }),
    ).toBeDisabled();
  });

  it('muestra en un popup los objetos que no se pueden subastar y por que', async () => {
    renderApp({
      route: '/programacion/nueva',
      container: staff({
        items: createFakeItemGateway({
          items: [
            ...AVAILABLE,
            itemFixture({ id: 'item-3', name: 'Termo azul', status: ItemStatus.SOLD }),
            itemFixture({ id: 'item-4', name: 'Paraguas', status: ItemStatus.WITHDRAWN }),
          ],
        }),
      }),
    });

    await userEvent.click(
      await screen.findByRole('button', { name: /ver objetos no disponibles/i }),
    );

    const popup = await screen.findByRole('dialog', {
      name: /objetos no disponibles para subastar/i,
    });
    expect(await within(popup).findByText('Termo azul')).toBeInTheDocument();
    expect(within(popup).getByText('Paraguas')).toBeInTheDocument();
    expect(within(popup).getByText(/ya se vendió/i)).toBeInTheDocument();
    // Lo disponible no se lista: ya esta en el selector de rondas.
    expect(within(popup).queryByText('Portatil Lenovo')).not.toBeInTheDocument();

    await userEvent.click(within(popup).getByRole('button', { name: /cerrar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no envia una sala con precio con centavos', async () => {
    const scheduled: ScheduleRoomRequest[] = [];
    renderApp({
      route: '/programacion/nueva',
      container: staff({ rooms: createFakeRoomGateway({ scheduled }) }),
    });

    await fillRoom();
    const price = screen.getByLabelText(/precio mínimo/i);
    await userEvent.clear(price);
    await userEvent.type(price, '1500.50');
    await userEvent.click(screen.getByRole('button', { name: 'Programar sala' }));

    expect(await screen.findByText(/sin centavos\.$/)).toBeInTheDocument();
    expect(scheduled).toHaveLength(0);
  });

  it('programa la sala tras confirmar y lleva a su ficha', async () => {
    const scheduled: ScheduleRoomRequest[] = [];
    renderApp({
      route: '/programacion/nueva',
      container: staff({ rooms: createFakeRoomGateway({ scheduled }) }),
    });

    await fillRoom();
    await userEvent.click(screen.getByRole('button', { name: 'Programar sala' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Programar la sala' }),
    );

    expect(
      await screen.findByText(/«Subasta de octubre» quedó programada con 1 ronda/),
    ).toBeInTheDocument();
    expect(scheduled).toEqual([
      {
        name: 'Subasta de octubre',
        maximumCapacity: 25,
        // Lo escrito en el formulario es hora de Bogota: 16:00 alla, 21:00 UTC.
        startsAt: '2030-10-01T21:00:00.000Z',
        rounds: [
          { entries: [{ kind: 'ITEM', catalogId: 'item-1' }], startingPrice: 50000 },
        ],
      },
    ]);
    // La ficha resuelve el nombre contra catalog y escribe el precio como pesos.
    expect(await screen.findByRole('link', { name: 'Portatil Lenovo' })).toBeInTheDocument();
    expect(screen.getByText('50.000 ECICoin')).toBeInTheDocument();
  });

  it('un 409 dice que algo dejo de estar disponible y no programa nada', async () => {
    renderApp({
      route: '/programacion/nueva',
      container: staff({
        rooms: createFakeRoomGateway({
          rejects: {
            schedule: new ApiError({
              type: ProblemType.INTERNAL,
              title: 'Conflict',
              status: 409,
              detail: 'Uno o mas objetos o lotes ya no estan disponibles.',
            }),
          },
        }),
      }),
    });

    await fillRoom();
    await userEvent.click(screen.getByRole('button', { name: 'Programar sala' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Programar la sala' }),
    );

    expect(
      await screen.findByText(/alguno de los objetos o lotes dejó de estar disponible/i),
    ).toBeInTheDocument();
  });
});

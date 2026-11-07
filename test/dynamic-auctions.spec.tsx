import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DutchPanel } from '@/features/auctions/components/dynamic/dutch-panel';
import { SealedPanel } from '@/features/auctions/components/dynamic/sealed-panel';
import type { Round } from '@/features/auctions/model/auction';
import type { ScheduleRoomRequest } from '@/features/rooms/model/room';
import {
  STAFF,
  createFakeAuthGateway,
  createFakeItemGateway,
  createFakeLotGateway,
  createFakeRoomGateway,
  createTestContainer,
  itemFixture,
  lotFixture,
  roomFixture,
} from './helpers/fake-gateways';
import { renderApp } from './helpers/render-app';

/**
 * Subastas dinamicas: el dueño de la sala activa la ruleta y la gira antes de cada ronda; la
 * sala se juega distinto segun lo que salga.
 */

function staff(rooms: ReturnType<typeof createFakeRoomGateway>) {
  return createTestContainer({
    auth: createFakeAuthGateway(STAFF),
    items: createFakeItemGateway({ items: [itemFixture({ id: 'item-1', name: 'Portatil Lenovo' })] }),
    lots: createFakeLotGateway({ lots: [lotFixture({ id: 'lot-1' })] }),
    rooms,
  });
}

/** El giro dura 3,2 s: se espera el resultado con margen. */
const AFTER_SPIN = { timeout: 6_000 };

describe('Subastas dinamicas: el dueño de la sala', () => {
  it('activa la ruleta, saca un comodin, vuelve a girar y queda la modalidad', async () => {
    const dynamicModes: Array<{ roomId: string; enabled: boolean }> = [];
    const room = roomFixture({ isOwner: true, dynamicModesEnabled: false });
    renderApp({
      route: '/programacion/room-1',
      container: staff(createFakeRoomGateway({ rooms: [room], spins: ['WILDCARD', 'DUTCH'], dynamicModes })),
    });

    await userEvent.click(await screen.findByRole('switch', { name: 'Subastas dinámicas' }));
    expect(dynamicModes).toEqual([{ roomId: 'room-1', enabled: true }]);

    await userEvent.click(await screen.findByRole('button', { name: /girar ruleta/i }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /girar ruleta/i }));
    expect(await screen.findByText('¡Comodín!', {}, AFTER_SPIN)).toBeInTheDocument();
    expect(screen.getByText(/gira otra vez para decidir/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /girar otra vez/i }));
    expect(await screen.findByText('¡Holandesa!', {}, AFTER_SPIN)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));

    // La ronda queda decidida y ya no se puede volver a girar.
    expect(await screen.findByText('↘ Holandesa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /girar ruleta/i })).not.toBeInTheDocument();
  }, 20_000);

  it('otro funcionario no ve la ruleta de una sala que no programo', async () => {
    renderApp({
      route: '/programacion/room-1',
      container: staff(createFakeRoomGateway({ rooms: [roomFixture({ isOwner: false, dynamicModesEnabled: true })] })),
    });
    expect(await screen.findByRole('heading', { name: 'Subasta de electrónica' })).toBeInTheDocument();
    expect(screen.queryByText(/subastas dinámicas/i)).not.toBeInTheDocument();
  });

  it('puede activarla desde que programa la sala', async () => {
    const scheduled: ScheduleRoomRequest[] = [];
    renderApp({ route: '/programacion/nueva', container: staff(createFakeRoomGateway({ scheduled })) });

    await userEvent.type(await screen.findByLabelText(/nombre de la sala/i), 'Subasta dinámica');
    fireEvent.change(screen.getByLabelText(/^inicio/i), { target: { value: '2030-10-01T16:00' } });
    await userEvent.type(screen.getByLabelText(/aforo máximo/i), '25');
    await userEvent.selectOptions(screen.getByLabelText(/objeto o lote de la ronda 1/i), 'ITEM:item-1');
    await userEvent.type(screen.getByLabelText(/precio mínimo/i), '50000');
    await userEvent.click(screen.getByRole('switch', { name: 'Subastas dinámicas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Programar sala' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Programar la sala' }));

    await screen.findByText(/quedó programada/);
    expect(scheduled[0]).toMatchObject({ name: 'Subasta dinámica', dynamicModes: true });
  });
});

const baseRound: Round = {
  id: 'round-1', position: 1, itemId: 'item-1', itemName: 'Reloj inteligente', imageUrl: null, status: 'ACTIVE',
  basePrice: 3000, currentPrice: 3000, minimumBid: 3000, currentBidderId: null,
  startedAt: new Date(Date.now() - 12_000).toISOString(), endsAt: new Date(Date.now() + 60_000).toISOString(),
  maximumEndsAt: null, buyNowPrice: null, leading: false, myHighestBid: null, wonByMe: false, closeReason: null, result: null,
  mode: 'CLASSIC', modeLocked: true, wildcardSpins: 0, dutch: null, sealed: null, mystery: null,
};

describe('Subastas dinamicas: la sala en juego', () => {
  it('sobre cerrado: exige el precio base y sella una sola puja', async () => {
    const onSeal = vi.fn();
    const round: Round = { ...baseRound, mode: 'SEALED', sealed: { count: 7, mine: null } };
    const { rerender } = render(<SealedPanel round={round} available={10_000} pending={false} participants={14} onSeal={onSeal} />);

    expect(screen.getByText('7 de 14 ya sellaron')).toBeInTheDocument();
    const field = screen.getByLabelText('Tu puja secreta');
    await userEvent.type(field, '2500');
    expect(screen.getByText(/al menos 3\.000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sellar mi puja/i })).toBeDisabled();

    await userEvent.clear(field);
    await userEvent.type(field, '4750');
    await userEvent.click(screen.getByRole('button', { name: /sellar mi puja/i }));
    expect(onSeal).toHaveBeenCalledWith(4750);

    // Ya sellado: se muestra el sobre y no hay forma de volver a pujar.
    rerender(<SealedPanel round={{ ...round, sealed: { count: 8, mine: 4750 } }} available={5250} pending={false} participants={14} onSeal={onSeal} />);
    expect(screen.getByText('Tu sobre está sellado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sellar mi puja/i })).not.toBeInTheDocument();
  });

  it('holandesa: muestra el precio que baja con el reloj y "Lo quiero" lo pide al instante', async () => {
    const onClaim = vi.fn();
    const round: Round = {
      ...baseRound,
      mode: 'DUTCH',
      // Abierta hace 12 s justo ahora, no al cargar el archivo: las pruebas anteriores tardan.
      startedAt: new Date(Date.now() - 12_000).toISOString(),
      dutch: { startPrice: 8000, floorPrice: 2000, step: 300, intervalSeconds: 5 },
    };
    render(<DutchPanel round={round} available={10_000} pending={false} watchers={14} onClaim={onClaim} />);

    // Abrio hace 12 s: van dos escalones de 300.
    expect(screen.getByText('7.400')).toBeInTheDocument();
    expect(screen.getByText('8.000')).toBeInTheDocument();
    expect(screen.getByText(/mínimo 2\.000/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /lo quiero/i }));
    expect(onClaim).toHaveBeenCalledWith(7400);
  });
});

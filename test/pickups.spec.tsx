import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PickupsPage from '@/features/pickups/pickups.page';
import type { Conversation, Slot } from '@/features/pickups/pickup.gateway';

const pickups = vi.hoisted(() => ({
  list: vi.fn(), conversation: vi.fn(), slots: vi.fn(), createSlot: vi.fn(),
  book: vi.fn(), code: vi.fn(), message: vi.fn(), missed: vi.fn(), deliver: vi.fn(),
}));
vi.mock('@/app/providers/container-provider', () => ({ useContainer: () => ({ pickups }) }));
vi.mock('@/features/auth/hooks/use-session', () => ({ useSession: () => ({ principal: { userId: 'winner' } }) }));

const slot: Slot = {
  id: 'slot', location: 'Recepción', startsAt: '2035-01-01T15:00:00Z',
  endsAt: '2035-01-01T16:00:00Z', capacity: 3, available: 2,
};
const base: Conversation = {
  roundId: 'round', roomId: 'room', winnerId: 'winner', title: 'Portátil', status: 'PENDING',
  entries: [], createdAt: '2026-11-01T12:00:00Z', slot: null,
  messages: [
    { id: '1', author: 'BOT', body: 'Elige un horario', createdAt: '2026-11-01T12:00:00Z' },
    { id: '2', author: 'WINNER', body: 'Necesito ayuda', createdAt: '2026-11-01T12:01:00Z' },
    { id: '3', author: 'STAFF', body: 'Con gusto', createdAt: '2026-11-01T12:02:00Z' },
  ],
};
const clients: QueryClient[] = [];

beforeEach(() => {
  for (const mock of Object.values(pickups)) mock.mockReset().mockResolvedValue(undefined);
  pickups.list.mockResolvedValue([base]);
  pickups.conversation.mockResolvedValue(base);
  pickups.slots.mockResolvedValue([slot]);
  pickups.code.mockResolvedValue({ code: 'abcdefghijklmnop' });
});
afterEach(() => { for (const client of clients.splice(0)) client.clear(); });

function open({ staff = false, detail = true } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[detail ? '/pickups/round' : '/pickups']}>
      <Routes><Route path="/pickups/:roundId?" element={<PickupsPage staff={staff} />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>);
}

describe('pickup screens', () => {
  it.each([false, true])('lists pickups with their status and correct detail link for staff=%s', async (staff) => {
    pickups.list.mockResolvedValue([base, { ...base, roundId: 'other', title: undefined, status: 'DELIVERED', slot }]);
    open({ staff, detail: false });
    const link = await screen.findByRole('link', { name: /portátil.*por agendar/i });
    expect(link).toHaveAttribute('href', staff ? '/gestion-recogidas/round' : '/mis-recogidas/round');
    expect(await screen.findByText('Entregada')).toBeInTheDocument();
    expect(pickups.list).toHaveBeenCalledWith(staff);
  });

  it('shows an empty list and allows retry after a failed list read', async () => {
    pickups.list.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([]);
    open({ detail: false });
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Todavía no hay recogidas')).toBeInTheDocument();
  });

  it('books an available slot and refreshes the conversation', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: /recepción/i }));
    await waitFor(() => expect(pickups.book).toHaveBeenCalledWith('round', 'slot'));
    await waitFor(() => expect(pickups.conversation.mock.calls.length).toBeGreaterThan(1));
    expect(screen.getByText('Tú')).toBeInTheDocument();
  });

  it('shows no availability and retries a failed slots read', async () => {
    pickups.slots.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([]);
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/No hay cupos por ahora/)).toBeInTheDocument();
  });

  it('retries a failed conversation read', async () => {
    pickups.conversation.mockRejectedValueOnce(new Error('Offline'));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Portátil' })).toBeInTheDocument();
  });

  it('generates a code for the current booking and does not offer its slot again', async () => {
    pickups.conversation.mockResolvedValue({ ...base, status: 'BOOKED', slot });
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Generar código de entrega' }));
    expect(await screen.findByText('abcdefghijklmnop')).toBeVisible();
    expect(pickups.code).toHaveBeenCalledWith('round');
    expect(screen.queryByRole('button', { name: /recepción/i })).not.toBeInTheDocument();
  });

  it('preserves a failed help message and sends its trimmed text on retry', async () => {
    pickups.conversation.mockResolvedValue({ ...base, status: 'NEEDS_HELP' });
    pickups.message.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
    open();
    const input = await screen.findByRole('textbox', { name: 'Pedir ayuda al personal' });
    await userEvent.type(input, '  ¿Dónde recojo?  ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(input).toHaveValue('  ¿Dónde recojo?  ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(pickups.message).toHaveBeenLastCalledWith(false, 'round', '¿Dónde recojo?');
    expect(screen.queryByRole('heading', { name: 'Elegir horario' })).not.toBeInTheDocument();
  });

  it('lets staff reply to a request for help', async () => {
    pickups.conversation.mockResolvedValue({ ...base, status: 'NEEDS_HELP', title: undefined });
    open({ staff: true });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Responder al ganador' }), 'En recepción');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    await waitFor(() => expect(pickups.message).toHaveBeenCalledWith(true, 'round', 'En recepción'));
    expect(screen.getByText('Ganador')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Adjudicación' })).toBeInTheDocument();
  });

  it('lets staff confirm delivery with the entered code', async () => {
    pickups.conversation.mockResolvedValue({ ...base, status: 'BOOKED', slot });
    open({ staff: true });
    await userEvent.type(await screen.findByRole('textbox', { name: 'Código del ganador' }), 'abcdefghijklmnop');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    await waitFor(() => expect(pickups.deliver).toHaveBeenCalledWith('round', 'abcdefghijklmnop'));
  });

  it('lets staff mark a missed booking after its end', async () => {
    pickups.conversation.mockResolvedValue({ ...base, status: 'BOOKED', slot: { ...slot, endsAt: '2020-01-01T16:00:00Z', startsAt: '2020-01-01T15:00:00Z' } });
    open({ staff: true });
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar inasistencia' }));
    await waitFor(() => expect(pickups.missed).toHaveBeenCalledWith('round'));
    expect(screen.queryByLabelText('Código del ganador')).not.toBeInTheDocument();
  });

  it('keeps delivered conversations readable without offering further actions', async () => {
    pickups.conversation.mockResolvedValue({ ...base, status: 'DELIVERED' });
    open();
    expect(await screen.findByText('Entregada')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Conversación de recogida' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar mensaje' })).not.toBeInTheDocument();
    expect(pickups.slots).not.toHaveBeenCalled();
  });

  it('creates staff slots in Colombia time and preserves fields on failure', async () => {
    pickups.createSlot.mockRejectedValueOnce(new Error('Conflict')).mockResolvedValue(undefined);
    pickups.slots.mockResolvedValue([]);
    open({ staff: true, detail: false });
    expect(await screen.findByText(/Aún no hay horarios futuros/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Lugar' }), { target: { value: 'Biblioteca' } });
    fireEvent.change(screen.getByLabelText(/^Inicio/), { target: { value: '2035-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/^Fin/), { target: { value: '2035-01-01T11:00' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Cupos' }), { target: { value: '4' } });
    await userEvent.click(screen.getByRole('button', { name: 'Agregar horario' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Lugar' })).toHaveValue('Biblioteca');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar horario' }));
    expect(await screen.findByText('Horario guardado.')).toBeInTheDocument();
    expect(pickups.createSlot.mock.calls.at(-1)?.[0]).toEqual({
      location: 'Biblioteca', startsAt: '2035-01-01T15:00:00.000Z', endsAt: '2035-01-01T16:00:00.000Z', capacity: 4,
    });
    expect(screen.getByRole('textbox', { name: 'Lugar' })).toHaveValue('');
  });

  it('retries staff slot errors without losing the pickup list', async () => {
    pickups.slots.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([slot]);
    open({ staff: true, detail: false });
    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('2 de 3 cupos libres')).toBeInTheDocument();
    expect(screen.getByText('Portátil')).toBeInTheDocument();
  });
});

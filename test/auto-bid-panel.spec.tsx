import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AutoBidPanel } from '@/features/auctions/components/auto-bid-panel';
import type { Round } from '@/features/auctions/model/auction';

function setup() {
  const onChange = vi.fn();
  const onEditingChange = vi.fn();
  const props = {
    autoBid: { enabled: true, limit: 200, stopped: false },
    round: { myHighestBid: null } as Round,
    nextBid: 100, onChange, pending: false, editing: true, onEditingChange,
  };
  render(<AutoBidPanel {...props} />);
  return { onChange, onEditingChange };
}

it('keeps focus with the user and validates the minimum before saving an automatic bid', async () => {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  const { onChange, onEditingChange } = setup();
  expect(trigger).toHaveFocus();
  const input = screen.getByLabelText('Nuevo límite máximo');
  await userEvent.type(input, '50');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('El límite debe ser al menos');
  expect(onChange).not.toHaveBeenCalled();
  await userEvent.clear(input);
  await userEvent.type(input, '300');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(onChange).toHaveBeenCalledWith({ enabled: true, limit: 300 });
  expect(onEditingChange).toHaveBeenCalledWith(false);
  trigger.remove();
});

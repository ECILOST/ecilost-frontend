import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemArt } from './item-art';

describe('ItemArt', () => {
  it('muestra la foto en la misma placa que el catalogo, tambien en las miniaturas', () => {
    const { rerender } = render(<ItemArt seed="item-1" label="Portatil" src="https://blob/a.png" variant="hero" />);
    expect(screen.getByRole('img', { name: 'Portatil' }).parentElement?.className).toMatch(/plate/);

    rerender(<ItemArt seed="item-1" label="Portatil" src="https://blob/a.png" variant="thumb" />);
    expect(screen.getByRole('img', { name: 'Portatil' }).parentElement?.className).toMatch(/thumb/);
  });

  it('si la foto no carga (enlace vencido) pinta el marcador en vez de una imagen rota', () => {
    const { container } = render(<ItemArt seed="item-1" label="Portatil" src="https://blob/a.png?se=x" />);

    fireEvent.error(screen.getByRole('img', { name: 'Portatil' }));

    expect(screen.queryByRole('img', { name: 'Portatil' })).toBeNull();
    expect(container).toHaveTextContent('Portatil');
  });

  it('vuelve a intentar cuando llega un enlace nuevo', () => {
    const { rerender } = render(<ItemArt seed="item-1" label="Portatil" src="https://blob/a.png?v=1" />);
    fireEvent.error(screen.getByRole('img', { name: 'Portatil' }));

    rerender(<ItemArt seed="item-1" label="Portatil" src="https://blob/a.png?v=2" />);

    expect(screen.getByRole('img', { name: 'Portatil' })).toHaveAttribute('src', 'https://blob/a.png?v=2');
  });
});

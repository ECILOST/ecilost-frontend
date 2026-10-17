import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlobFrame, plateRatio } from './blob-frame';

describe('plateRatio', () => {
  it('respeta la proporcion de las fotos habituales: no hay recorte', () => {
    expect(plateRatio(1)).toBe(1);
    expect(plateRatio(4 / 3)).toBeCloseTo(4 / 3);
    expect(plateRatio(3 / 4)).toBeCloseTo(3 / 4);
  });

  it('acota las fotos extremas a 4:3 y 3:4 para no romper la tarjeta', () => {
    expect(plateRatio(3)).toBeCloseTo(4 / 3);
    expect(plateRatio(1 / 3)).toBeCloseTo(3 / 4);
  });

  it('sin proporcion conocida usa una placa cuadrada', () => {
    expect(plateRatio(0)).toBe(1);
    expect(plateRatio(Number.NaN)).toBe(1);
  });
});

describe('BlobFrame', () => {
  it('la placa toma la forma de la foto al cargarla', () => {
    render(<BlobFrame src="https://blob/vertical.png" alt="Botella" />);
    const photo = screen.getByRole('img', { name: 'Botella' });
    const plate = photo.parentElement!;
    expect(plate).toHaveAttribute('data-orientation', 'landscape');

    // Foto de celular, vertical (3:4).
    Object.defineProperty(photo, 'naturalWidth', { value: 900 });
    Object.defineProperty(photo, 'naturalHeight', { value: 1200 });
    fireEvent.load(photo);

    expect(plate).toHaveAttribute('data-orientation', 'portrait');
    expect(plate.style.getPropertyValue('--plate-ratio')).toBe('0.75');
  });

  it('con fotografia la muestra en su placa, sobre las manchas', () => {
    render(
      <BlobFrame
        src="https://blob/a.png"
        alt="Portatil"
        fit="cover"
        fallback="P"
      />,
    );

    const photo = screen.getByRole('img', { name: 'Portatil' });
    expect(photo.parentElement?.className).toMatch(/plate/);
    expect(photo.closest('[data-shape]')?.className).toMatch(/withPhoto/);
    expect(screen.queryByText('P')).toBeNull();
  });

  it('sin fotografia queda el collage con la inicial', () => {
    const { container } = render(<BlobFrame fallback="P" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container).toHaveTextContent('P');
    expect(container.firstElementChild?.className).not.toMatch(/withPhoto/);
  });

  it('si la foto no carga (enlace vencido) vuelve a la inicial, y reintenta con un enlace nuevo', () => {
    const { container, rerender } = render(
      <BlobFrame src="https://blob/a.png?v=1" alt="Portatil" fallback="P" />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Portatil' }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(container).toHaveTextContent('P');

    rerender(
      <BlobFrame src="https://blob/a.png?v=2" alt="Portatil" fallback="P" />,
    );
    expect(screen.getByRole('img', { name: 'Portatil' })).toHaveAttribute(
      'src',
      'https://blob/a.png?v=2',
    );
  });
});

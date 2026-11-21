import { describe, expect, it } from 'vitest';
import { objectKindFor } from './object-illustration';

describe('objectKindFor', () => {
  it.each([
    ['Audífonos Sony', null, 'headphones'],
    ['Mochila negra', 'Accesorios', 'backpack'],
    ['Termo Stanley', 'Hogar', 'bottle'],
    ['MacBook Air', 'Electrónica', 'laptop'],
    ['Control PS5', 'Videojuegos', 'gamepad'],
    ['Tenis deportivos', 'Ropa', 'sneaker'],
  ])('reconoce %s', (name, category, kind) => {
    expect(objectKindFor(name, category)).toBe(kind);
  });

  it('sin coincidencia no adivina: se pinta la inicial', () => {
    expect(objectKindFor('Chaqueta de jean', 'Ropa')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import css from './tokens.css?raw';

/**
 * Contraste de la paleta, calculado sobre `tokens.css` tal como esta escrito.
 *
 * Los ratios del comentario de cabecera son una foto; esta prueba es la que manda. Si alguien
 * aclara un texto o cambia el ambar y deja de llegar a AA, falla aqui y no en una auditoria.
 */

const declarations = new Map(
  [...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

/** Sigue las cadenas `var(--x)` hasta un hexadecimal. */
function hex(token: string): string {
  let value = declarations.get(token);
  for (let depth = 0; value && depth < 10; depth++) {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    if (!ref) break;
    value = declarations.get(ref[1]);
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`${token} no resuelve a un hexadecimal: ${value}`);
  }
  return value;
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(hex(a)), luminance(hex(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = ['--color-bg', '--color-surface', '--color-surface-raised'];

describe('Contraste de la paleta (WCAG 2.2 AA)', () => {
  it.each([
    '--color-text',
    '--color-text-muted',
    '--color-text-subtle',
    '--color-primary-text',
    '--color-error',
    '--color-success',
    '--color-warning',
    '--color-info',
  ])('%s se lee sobre fondo, superficie y tarjeta (>= 4.5)', (text) => {
    for (const bg of BACKGROUNDS) expect(ratio(text, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto del boton primario se lee sobre el ambar en reposo, hover y activo', () => {
    for (const fill of ['--color-primary', '--color-primary-hover', '--color-primary-active']) {
      expect(ratio('--color-on-primary', fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('el texto blanco se lee sobre los rellenos fuertes', () => {
    for (const fill of ['--color-error', '--color-error-hover', '--color-success']) {
      expect(ratio('--color-on-strong', fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('los avisos se leen sobre su propio fondo', () => {
    expect(ratio('--color-error', '--color-error-bg')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--color-success', '--color-success-bg')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--color-warning', '--color-warning-bg')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--color-info', '--color-info-bg')).toBeGreaterThanOrEqual(4.5);
  });

  it('el anillo de foco se distingue sobre fondo y sobre ambar (>= 3)', () => {
    for (const bg of [...BACKGROUNDS, '--color-primary']) {
      expect(ratio('--color-focus', bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it('el boton de Google cumple sus propios minimos', () => {
    expect(ratio('--google-text', '--google-bg')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('--google-border', '--google-bg')).toBeGreaterThanOrEqual(3);
  });
});

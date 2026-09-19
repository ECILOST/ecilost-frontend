import { describe, expect, it } from 'vitest';
import { formatEcicoin, isValidAmount } from './ecicoin';

describe('formatEcicoin', () => {
  it('siempre escribe los dos decimales', () => {
    expect(formatEcicoin('150000')).toBe('150.000,00');
    expect(formatEcicoin('0')).toBe('0,00');
  });

  it('no pierde precision con importes que no caben en un double', () => {
    // El servicio guarda Decimal(18, 2) y lo manda como texto justamente por esto. Pasarlo
    // por Number lo redondearia, y aqui se veria el redondeo.
    expect(formatEcicoin('9007199254740993.01')).toBe(
      '9.007.199.254.740.993,01',
    );
  });

  it('no pinta NaN cuando lo que llega no es un importe', () => {
    expect(formatEcicoin('')).toBe('—');
    expect(formatEcicoin('mucho')).toBe('—');
  });
});

describe('isValidAmount', () => {
  it('acepta lo que el servicio acepta', () => {
    expect(isValidAmount('50000')).toBe(true);
    expect(isValidAmount('0.01')).toBe(true);
    expect(isValidAmount(' 12.50 ')).toBe(true);
  });

  it('rechaza lo que el servicio rechazaria', () => {
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('-5')).toBe(false);
    // Tres decimales: el servicio los rechaza, asi que no se gasta la peticion en pedirlo.
    expect(isValidAmount('1.005')).toBe(false);
    expect(isValidAmount('')).toBe(false);
    expect(isValidAmount('cincuenta')).toBe(false);
  });
});

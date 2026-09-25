import { describe, expect, it } from 'vitest';
import { formatEcicoin, isValidAmount } from './ecicoin';

describe('formatEcicoin', () => {
  it('escribe el importe como pesos, sin centavos', () => {
    expect(formatEcicoin('150000')).toBe('150.000');
    // Asi llega del servicio: Decimal(18, 2) serializado como texto.
    expect(formatEcicoin('150000.00')).toBe('150.000');
    expect(formatEcicoin('0')).toBe('0');
  });

  it('no pierde precision con importes que no caben en un double', () => {
    // El servicio manda los importes como texto justamente por esto. Pasarlo por Number lo
    // redondearia, y aqui se veria el redondeo.
    expect(formatEcicoin('9007199254740993')).toBe('9.007.199.254.740.993');
  });

  it('no pinta NaN cuando lo que llega no es un importe', () => {
    expect(formatEcicoin('')).toBe('—');
    expect(formatEcicoin('mucho')).toBe('—');
  });
});

describe('isValidAmount', () => {
  it('acepta lo que el servicio acepta', () => {
    expect(isValidAmount('50000')).toBe(true);
    expect(isValidAmount(' 1250 ')).toBe(true);
  });

  it('rechaza lo que el servicio rechazaria', () => {
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('-5')).toBe(false);
    // Un ECICoin vale un peso: no hay centavos que abonar.
    expect(isValidAmount('12.50')).toBe(false);
    expect(isValidAmount('')).toBe(false);
    expect(isValidAmount('cincuenta')).toBe(false);
  });
});

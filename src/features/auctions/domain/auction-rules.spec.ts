import { describe, expect, it } from 'vitest';
import { coinsToCommit } from './auction-rules';

describe('coinsToCommit', () => {
  it('quien lidera y mejora su propia puja solo reserva la diferencia', () => {
    expect(coinsToCommit(600, { leading: true, myHighestBid: 500 })).toBe(100);
  });

  it('quien fue superado ya no tiene reserva: compromete la puja entera', () => {
    expect(coinsToCommit(700, { leading: false, myHighestBid: 500 })).toBe(700);
  });

  it('la primera puja de la ronda compromete la puja entera', () => {
    expect(coinsToCommit(500, { leading: false, myHighestBid: null })).toBe(
      500,
    );
  });

  it('nunca es negativo', () => {
    expect(coinsToCommit(400, { leading: true, myHighestBid: 500 })).toBe(0);
  });
});

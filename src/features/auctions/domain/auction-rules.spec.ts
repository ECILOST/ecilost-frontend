import { describe, expect, it } from 'vitest';
import { claimDeadline, coinsToCommit, roundSoldToSomeoneElse } from './auction-rules';

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

describe('roundSoldToSomeoneElse (HU-25)', () => {
  const round = (overrides: Partial<{ id: string; status: string; closeReason: string | null; wonByMe: boolean }> = {}) => ({
    id: 'r1', status: 'CLOSED', closeReason: 'BUY_NOW', wonByMe: false, ...overrides,
  });

  it('avisa cuando otro compro de inmediato la ronda que se estaba viendo', () => {
    const closed = round();
    expect(roundSoldToSomeoneElse({ id: 'r1' }, [closed, round({ id: 'r2', status: 'ACTIVE', closeReason: null })])).toBe(closed);
  });

  it('no avisa a quien la compro: a el se le dice que gano', () => {
    expect(roundSoldToSomeoneElse({ id: 'r1' }, [round({ wonByMe: true })])).toBeNull();
  });

  it('no avisa si la ronda vencio por su reloj', () => {
    expect(roundSoldToSomeoneElse({ id: 'r1' }, [round({ closeReason: 'EXPIRED' })])).toBeNull();
  });

  it('no avisa si la ronda vista sigue abierta o no habia ronda a la vista', () => {
    expect(roundSoldToSomeoneElse({ id: 'r1' }, [round({ status: 'ACTIVE', closeReason: null })])).toBeNull();
    expect(roundSoldToSomeoneElse(null, [round()])).toBeNull();
  });
});

describe('claimDeadline', () => {
  it('da la fecha de Bogota a siete dias, aunque el navegador este en otra zona', () => {
    // 15 de octubre, 23:30 en Bogota (ya 16 en UTC).
    const wonAt = Date.parse('2026-10-16T04:30:00.000Z');
    expect(claimDeadline(wonAt)).toBe('22 de octubre');
  });
});

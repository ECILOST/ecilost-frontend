import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordServerTime } from '@/shared/api/server-clock';
import { useCountdown } from './use-countdown';

const LOCAL = Date.parse('2026-10-15T12:00:00.000Z');

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(LOCAL);
  });
  afterEach(() => vi.useRealTimers());

  it('cuenta con la hora del servidor, no con el reloj del navegador', () => {
    // El navegador va dos minutos adelantado respecto al servidor.
    recordServerTime('2026-10-15T11:58:00.000Z');

    const { result } = renderHook(() =>
      useCountdown('2026-10-15T12:00:00.000Z'),
    );

    expect(result.current).toBe(2 * 60_000);
  });

  it('la diferencia se mide al llegar la respuesta: pintarla despues no mueve la cuenta', () => {
    recordServerTime('2026-10-15T12:00:00.000Z');
    // La pantalla se vuelve a montar tres minutos despues, con la sala servida de cache.
    vi.setSystemTime(LOCAL + 3 * 60_000);

    const { result } = renderHook(() =>
      useCountdown('2026-10-15T12:05:00.000Z'),
    );

    expect(result.current).toBe(2 * 60_000);
  });

  it('avanza cada segundo y no baja de cero', () => {
    const { result } = renderHook(() =>
      useCountdown('2026-10-15T12:00:02.000Z'),
    );
    expect(result.current).toBe(2_000);

    act(() => vi.advanceTimersByTime(5_000));

    expect(result.current).toBe(0);
  });
});

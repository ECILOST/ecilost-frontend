import { describe, expect, it } from 'vitest';
import {
  acceptsAscendingBids,
  ANNOUNCE_WINDOW_MS,
  detectRouletteSpin,
  dutchHistory,
  dutchNextDrop,
  dutchPriceAt,
  shouldAnnounce,
} from './dynamic-modes';

const schedule = { startPrice: 8000, floorPrice: 2000, step: 300, intervalSeconds: 5 };
const startedAt = '2026-10-16T10:00:00.000Z';
const at = (seconds: number) => Date.parse(startedAt) + seconds * 1000;

describe('precio holandes', () => {
  it('baja un escalon por intervalo, igual que el servidor, y nunca pasa del minimo', () => {
    expect(dutchPriceAt(schedule, startedAt, at(0))).toBe(8000);
    expect(dutchPriceAt(schedule, startedAt, at(4.9))).toBe(8000);
    expect(dutchPriceAt(schedule, startedAt, at(5))).toBe(7700);
    expect(dutchPriceAt(schedule, startedAt, at(60))).toBe(4400);
    expect(dutchPriceAt(schedule, startedAt, at(600))).toBe(2000);
  });

  it('dice cuanto falta para la proxima bajada y a cuanto', () => {
    expect(dutchNextDrop(schedule, startedAt, at(12))).toEqual({ inMs: 3000, progress: 0.4, nextPrice: 7100 });
    expect(dutchNextDrop(schedule, startedAt, at(600))).toEqual({ inMs: null, progress: 1, nextPrice: null });
  });

  it('recuerda los ultimos precios por los que paso', () => {
    expect(dutchHistory(schedule, startedAt, at(12))).toEqual([8000, 7700]);
    expect(dutchHistory(schedule, startedAt, at(60))).toEqual([5300, 5000, 4700]);
    expect(dutchHistory(schedule, startedAt, at(0))).toEqual([]);
  });
});

describe('ruleta y anuncio', () => {
  const round = { id: 'r2', position: 2, status: 'SCHEDULED', mode: 'CLASSIC' as const, modeLocked: false, wildcardSpins: 0 };

  it('detecta que la ruleta fijo una modalidad para la proxima ronda', () => {
    expect(detectRouletteSpin([round], [{ ...round, mode: 'SEALED', modeLocked: true }]))
      .toEqual({ roundId: 'r2', position: 2, segment: 'SEALED' });
  });

  it('detecta un comodin porque crecen los comodines de la ronda', () => {
    expect(detectRouletteSpin([round], [{ ...round, wildcardSpins: 1 }]))
      .toEqual({ roundId: 'r2', position: 2, segment: 'WILDCARD' });
  });

  it('no anima nada si la ruleta no giro o la ronda ya empezo', () => {
    expect(detectRouletteSpin([round], [round])).toBeNull();
    expect(detectRouletteSpin([round], [{ ...round, status: 'ACTIVE', mode: 'DUTCH', modeLocked: true }])).toBeNull();
  });

  it('anuncia una ronda dinamica que acaba de empezar, no una clasica ni una empezada hace rato', () => {
    const active = { status: 'ACTIVE', mode: 'MYSTERY' as const, startedAt };
    expect(shouldAnnounce(active, at(2))).toBe(true);
    expect(shouldAnnounce(active, Date.parse(startedAt) + ANNOUNCE_WINDOW_MS + 1)).toBe(false);
    expect(shouldAnnounce({ ...active, mode: 'CLASSIC' }, at(2))).toBe(false);
  });

  it('solo la clasica y el lote misterioso se pujan hacia arriba', () => {
    expect(['CLASSIC', 'DUTCH', 'SEALED', 'MYSTERY'].map((mode) => acceptsAscendingBids(mode as never)))
      .toEqual([true, false, false, true]);
  });
});

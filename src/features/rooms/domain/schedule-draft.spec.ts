import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  toScheduleRequest,
  validateDraft,
  type ScheduleDraft,
} from './schedule-draft';

const NOW = new Date('2026-09-25T12:00:00');

const draft = (overrides: Partial<ScheduleDraft> = {}): ScheduleDraft => ({
  name: 'Sala de electrónica',
  startsAt: '2026-10-01T16:00',
  capacity: '30',
  rounds: [
    { id: 'r1', entry: 'ITEM:item-1', startingPrice: '50000' },
    { id: 'r2', entry: 'LOT:lot-1', startingPrice: '120000' },
  ],
  ...overrides,
});

describe('validateDraft', () => {
  it('acepta una sala completa', () => {
    expect(hasErrors(validateDraft(draft(), NOW))).toBe(false);
  });

  it('exige nombre, inicio futuro y aforo entero positivo', () => {
    const errors = validateDraft(
      draft({ name: '  ', startsAt: '2026-09-25T11:00', capacity: '0' }),
      NOW,
    );
    expect(errors.name).toBeDefined();
    expect(errors.startsAt).toMatch(/futuro/);
    expect(errors.capacity).toBeDefined();
  });

  it('exige una entrada por ronda y no deja repetirla en la misma sala', () => {
    const errors = validateDraft(
      draft({
        rounds: [
          { id: 'r1', entry: 'ITEM:item-1', startingPrice: '50000' },
          { id: 'r2', entry: 'ITEM:item-1', startingPrice: '50000' },
          { id: 'r3', entry: '', startingPrice: '50000' },
        ],
      }),
      NOW,
    );
    expect(errors.rounds.r1).toBeUndefined();
    expect(errors.rounds.r2.entry).toMatch(/otra ronda/);
    expect(errors.rounds.r3.entry).toBeDefined();
  });

  it('rechaza precios con centavos, cero o vacios: un ECICoin vale un peso', () => {
    const errors = validateDraft(
      draft({
        rounds: [
          { id: 'r1', entry: 'ITEM:item-1', startingPrice: '1500.50' },
          { id: 'r2', entry: 'LOT:lot-1', startingPrice: '0' },
        ],
      }),
      NOW,
    );
    expect(errors.rounds.r1.startingPrice).toBeDefined();
    expect(errors.rounds.r2.startingPrice).toBeDefined();
  });
});

describe('toScheduleRequest', () => {
  it('arma el cuerpo de POST /rooms con una entrada por ronda', () => {
    const request = toScheduleRequest(draft({ name: '  Sala de electrónica ' }));

    expect(request).toMatchObject({
      name: 'Sala de electrónica',
      maximumCapacity: 30,
      rounds: [
        { entries: [{ kind: 'ITEM', catalogId: 'item-1' }], startingPrice: 50000 },
        { entries: [{ kind: 'LOT', catalogId: 'lot-1' }], startingPrice: 120000 },
      ],
    });
    // La hora local del control se envia como instante absoluto.
    expect(request.startsAt).toBe(new Date('2026-10-01T16:00').toISOString());
  });
});

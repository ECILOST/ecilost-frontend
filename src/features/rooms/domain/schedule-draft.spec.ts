import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  toScheduleRequest,
  validateDraft,
  type ScheduleDraft,
} from './schedule-draft';

// Mediodia en Bogota: el formulario se lee en esa zona, este donde este el equipo.
const NOW = new Date('2026-09-25T12:00:00-05:00');

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

  it('la compra inmediata es opcional, pero si se escribe es entera y mayor que el minimo', () => {
    const errors = validateDraft(
      draft({
        rounds: [
          { id: 'r1', entry: 'ITEM:item-1', startingPrice: '50000', buyNowPrice: '50000' },
          { id: 'r2', entry: 'LOT:lot-1', startingPrice: '120000', buyNowPrice: '150000.5' },
          { id: 'r3', entry: 'ITEM:item-2', startingPrice: '1000', buyNowPrice: '  ' },
          { id: 'r4', entry: 'ITEM:item-3', startingPrice: '1000', buyNowPrice: '5000' },
        ],
      }),
      NOW,
    );
    expect(errors.rounds.r1.buyNowPrice).toMatch(/mayor que el precio mínimo/);
    expect(errors.rounds.r2.buyNowPrice).toMatch(/entero/);
    expect(errors.rounds.r3).toBeUndefined();
    expect(errors.rounds.r4).toBeUndefined();
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
    // 16:00 en Bogota son las 21:00 UTC.
    expect(request.startsAt).toBe('2026-10-01T21:00:00.000Z');
  });

  it('manda la compra inmediata solo en las rondas que la ofrecen', () => {
    const request = toScheduleRequest(
      draft({
        rounds: [
          { id: 'r1', entry: 'ITEM:item-1', startingPrice: '50000', buyNowPrice: ' 90000 ' },
          { id: 'r2', entry: 'LOT:lot-1', startingPrice: '120000', buyNowPrice: '' },
        ],
      }),
    );
    expect(request.rounds[0].buyNowPrice).toBe(90000);
    expect(request.rounds[1]).not.toHaveProperty('buyNowPrice');
  });
});

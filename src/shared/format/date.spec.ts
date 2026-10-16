import { describe, expect, it } from 'vitest';
import { formatWhen } from '@/features/auctions/domain/auction-rules';
import { bogotaDay, formatDateTime, parseBogotaLocal } from './date';

describe('fechas en hora de Bogota', () => {
  it('lee la hora escrita en el formulario como hora de Bogota', () => {
    expect(parseBogotaLocal('2026-10-20T15:00').toISOString()).toBe(
      '2026-10-20T20:00:00.000Z',
    );
  });

  it('muestra la hora de Bogota aunque el instante ya sea otro dia en UTC', () => {
    // 20 de octubre 23:30 en Bogota = 21 de octubre 04:30 UTC.
    expect(formatDateTime('2026-10-21T04:30:00.000Z')).toMatch(/^20\/10\/2026, 11:30/);
  });

  it('hoy y mañana se cuentan con el calendario de Bogota', () => {
    const now = new Date('2026-10-21T04:00:00.000Z'); // 20 oct, 23:00 en Bogota
    expect(bogotaDay(now.getTime())).toBe(
      bogotaDay(Date.parse('2026-10-20T06:00:00.000Z')),
    );
    // 21 oct 10:00 en Bogota: es mañana, aunque en UTC ya sea "hoy".
    expect(formatWhen('2026-10-21T15:00:00.000Z', now)).toMatch(/^Mañana · /);
  });
});

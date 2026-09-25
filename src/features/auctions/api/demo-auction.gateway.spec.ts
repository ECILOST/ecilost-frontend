import { describe, expect, it } from 'vitest';
import { createDemoAuctionGateway } from './demo-auction.gateway';

/** Reloj manual: las reglas de tiempo se prueban sin esperar. */
function clock(start = Date.parse('2030-01-01T10:00:00.000Z')) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe('Adaptador de demostracion de subastas', () => {
  it('rechaza una puja por debajo del vigente mas 100, como el servicio', async () => {
    const gateway = createDemoAuctionGateway({ rivals: false, tickMs: 0 });
    await expect(gateway.placeBid('sala-04', 479)).rejects.toThrow(
      'La puja debe ser de al menos 480 ECICoin.',
    );
  });

  it('acepta cualquier monto entero por encima de la minima', async () => {
    const gateway = createDemoAuctionGateway({ rivals: false, tickMs: 0 });
    const after = await gateway.placeBid('sala-04', 1_234);
    expect(after.round).toMatchObject({ currentPrice: 1_234, leading: true, minimumBid: 1_334 });
  });

  it('una puja en los ultimos 10 segundos extiende la ronda sin pasar del maximo', async () => {
    const time = clock();
    const gateway = createDemoAuctionGateway({
      rivals: false,
      tickMs: 0,
      now: time.now,
    });
    const before = await gateway.liveRoom('sala-04');
    const endsAt = Date.parse(before.round!.endsAt!);

    time.advance(endsAt - time.now() - 5_000);
    const after = await gateway.placeBid('sala-04', 480);

    expect(Date.parse(after.round!.endsAt!)).toBe(endsAt + 10_000);
  });

  it('al vencer la ronda la adjudica y abre la siguiente', async () => {
    const time = clock();
    const gateway = createDemoAuctionGateway({
      rivals: false,
      tickMs: 0,
      now: time.now,
    });
    const before = await gateway.liveRoom('sala-04');

    time.advance(Date.parse(before.round!.endsAt!) - time.now() + 1);
    const after = await gateway.liveRoom('sala-04');

    expect(after.round?.itemName).toBe('Audífonos Sony');
    expect(
      after.room.rounds.find((round) => round.itemName === 'Mochila negra'),
    ).toMatchObject({
      status: 'CLOSED',
      wonByMe: true,
    });
  });

  it('solo puja quien fue admitido antes del inicio', async () => {
    const gateway = createDemoAuctionGateway({ rivals: false, tickMs: 0 });
    await expect(gateway.placeBid('sala-07', 1_510)).rejects.toThrow(
      /ingreso a esta sala cerró/,
    );
    await expect(gateway.joinRoom('sala-07')).rejects.toThrow('Sala cerrada.');
  });

  it('la puja automatica se detiene al pasar el limite y lo notifica', async () => {
    const time = clock();
    const gateway = createDemoAuctionGateway({
      rivals: true,
      tickMs: 0,
      now: time.now,
      random: () => 0,
    });
    await gateway.setAutoBid('sala-04', { enabled: true, limit: 380 });

    // El rival simulado puja 480; la siguiente respuesta (580) pasa el limite de 380.
    time.advance(20_000);
    await gateway.liveRoom('sala-04');
    const state = await gateway.liveRoom('sala-04');

    expect(state.round?.leading).toBe(false);
    expect(state.autoBid.stopped).toBe(true);
    const notifications = await gateway.notifications();
    expect(notifications[0]).toMatchObject({ kind: 'LIMIT', read: false });
  });
});

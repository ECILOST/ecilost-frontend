import { describe, expect, it, vi } from 'vitest';
import { ApiError, ProblemType } from '@/shared/api/problem-details';
import type { HttpClient } from '@/shared/api/http-client';
import { createHttpWalletGateway } from './http-wallet.gateway';

/** Cliente de mentira: solo registra a donde se llamo y con que. */
function clientThat(
  responses: Partial<Record<string, unknown>>,
  calls: string[] = [],
): HttpClient {
  const answer = (verb: string) => (path: string) => {
    calls.push(`${verb} ${path}`);
    const response = responses[`${verb} ${path}`];
    if (response instanceof Error) return Promise.reject(response);
    return Promise.resolve(response);
  };

  return {
    baseUrl: '/api/wallet',
    get: answer('GET') as HttpClient['get'],
    post: answer('POST') as HttpClient['post'],
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

const NOT_FOUND = new ApiError({
  type: ProblemType.WALLET_NOT_FOUND,
  title: 'El recurso no existe',
  status: 404,
});

describe('createHttpWalletGateway', () => {
  it('lee la billetera sin escribir cuando ya existe', async () => {
    const calls: string[] = [];
    const gateway = createHttpWalletGateway(
      clientThat({ 'GET /me': { availableBalance: '100.00' } }, calls),
    );

    await gateway.mine();

    // Una sola peticion, y de lectura: es el camino de siempre, salvo el primer dia.
    expect(calls).toEqual(['GET /me']);
  });

  it('emite la billetera la primera vez, que es cuando el GET responde 404', async () => {
    const calls: string[] = [];
    const gateway = createHttpWalletGateway(
      clientThat(
        {
          'GET /me': NOT_FOUND,
          'POST /me/bootstrap': { availableBalance: '100.00' },
        },
        calls,
      ),
    );

    const wallet = await gateway.mine();

    expect(calls).toEqual(['GET /me', 'POST /me/bootstrap']);
    expect(wallet.availableBalance).toBe('100.00');
  });

  it('un fallo que no sea 404 se propaga: no se provisiona a ciegas', async () => {
    const calls: string[] = [];
    const gateway = createHttpWalletGateway(
      clientThat(
        {
          'GET /me': new ApiError({
            type: ProblemType.INTERNAL,
            title: 'Error interno',
            status: 500,
          }),
        },
        calls,
      ),
    );

    await expect(gateway.mine()).rejects.toThrow(ApiError);
    expect(calls).toEqual(['GET /me']);
  });
});

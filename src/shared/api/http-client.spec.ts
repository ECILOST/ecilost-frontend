import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './http-client';
import { ApiError, ProblemType } from './problem-details';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('createHttpClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('omite los filtros sin valor en vez de mandarlos vacios', async () => {
    const fetchMock = stubFetch(jsonResponse([]));
    const http = createHttpClient({ baseUrl: '/api/catalog' });

    await http.get('/items', {
      query: { status: 'AVAILABLE', category: undefined },
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/catalog/items?status=AVAILABLE',
    );
  });

  it('firma la peticion con el token vigente', async () => {
    const fetchMock = stubFetch(jsonResponse({}));
    const http = createHttpClient({
      baseUrl: '/api',
      getAccessToken: () => 'jwt-123',
    });

    await http.get('/auth/me');

    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe('Bearer jwt-123');
  });

  it('no declara Content-Type en un multipart, para no pisar el boundary', async () => {
    const fetchMock = stubFetch(jsonResponse({}, { status: 201 }));
    const http = createHttpClient({ baseUrl: '/api/catalog' });

    await http.post('/items/1/media', new FormData());

    const headers = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('traduce el cuerpo de error a ApiError conservando el tipo del problema', async () => {
    stubFetch(
      jsonResponse(
        { type: ProblemType.NOT_FOUND, title: 'No existe', status: 404 },
        { status: 404 },
      ),
    );
    const http = createHttpClient({ baseUrl: '/api/catalog' });

    const error = await http
      .get('/items/nope')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).is(ProblemType.NOT_FOUND)).toBe(true);
  });

  it('avisa de la sesion caida ante un 401', async () => {
    stubFetch(jsonResponse({ error: 'unauthorized' }, { status: 401 }));
    const onUnauthenticated = vi.fn();
    const http = createHttpClient({ baseUrl: '/api/auth', onUnauthenticated });

    await http.get('/auth/me').catch(() => undefined);

    expect(onUnauthenticated).toHaveBeenCalledOnce();
  });

  it('devuelve sin cuerpo cuando el servicio responde 204', async () => {
    stubFetch(new Response(null, { status: 204 }));
    const http = createHttpClient({ baseUrl: '/api/catalog' });

    await expect(http.delete('/items/1')).resolves.toBeUndefined();
  });
});

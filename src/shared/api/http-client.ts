import { ApiError, toProblem } from './problem-details';

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions extends Omit<
  RequestInit,
  'body' | 'headers' | 'method'
> {
  /** Parametros de consulta. Los `undefined` no se envian, para no mandar `?status=`. */
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
}

/**
 * Unico punto por el que la aplicacion habla con un servicio. Los adaptadores de cada
 * feature (`features/<f>/api/`) lo reciben ya construido; ninguno llama a `fetch` por su
 * cuenta, porque entonces el token, la cookie y el formato de error se resolverian una vez
 * por archivo y con suerte igual.
 */
export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
  /** Base del servicio, para las navegaciones completas (el login de Google). */
  readonly baseUrl: string;
}

export interface HttpClientOptions {
  baseUrl: string;
  /** De donde sale el `Authorization: Bearer`. Sin token, la peticion va anonima. */
  getAccessToken?: () => string | null;
  /** Aviso de que la sesion ya no sirve. Lo escucha la sesion para volver a /login. */
  onUnauthenticated?: () => void;
}

export function createHttpClient({
  baseUrl,
  getAccessToken,
  onUnauthenticated,
}: HttpClientOptions): HttpClient {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const { query, headers, ...init } = options;
    const token = getAccessToken?.() ?? null;
    const isForm = body instanceof FormData;

    const response = await fetch(buildUrl(baseUrl, path, query), {
      ...init,
      method,
      // La sesion vive en una cookie httpOnly. Sin esto, el canje del token en
      // POST /auth/token sale sin ella y responde 401 sin explicar nada.
      credentials: 'include',
      // En un multipart el navegador pone el Content-Type con su boundary; escribirlo a
      // mano rompe la subida de multimedia.
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isForm
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });

    // Se avisa antes de lanzar: quien escucha decide si renueva o cierra la sesion, y la
    // pantalla recibe igual su error.
    if (response.status === 401) onUnauthenticated?.();
    if (!response.ok) throw new ApiError(await toProblem(response));
    // 204 es la respuesta de los borrados. Pedir el JSON de un cuerpo vacio lanza.
    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
  }

  return {
    baseUrl,
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    delete: (path, options) => request('DELETE', path, undefined, options),
  };
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const url = `${baseUrl}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

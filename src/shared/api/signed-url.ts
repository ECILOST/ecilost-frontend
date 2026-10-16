/**
 * Las fotografias y videos llegan como URL firmadas de Azure Blob Storage que caducan a los
 * quince minutos. Catalog reutiliza la misma firma mientras le queda vida, asi que una URL
 * recien recibida puede llevar ya varios minutos gastados: la edad de la respuesta no dice
 * cuanto le queda al enlace. Lo dice el propio enlace, en su parametro `se` (signed expiry).
 */

/** Margen minimo de vida que debe tener un enlace para seguir sirviendolo desde cache. */
export const SIGNED_URL_MARGIN_MS = 2 * 60 * 1000;

/** Instante en que caduca el enlace, o `null` si no es una URL firmada que se entienda. */
export function signedUrlExpiresAt(url: string): number | null {
  try {
    const expiry = new URL(url, 'http://localhost').searchParams.get('se');
    if (!expiry) return null;
    const at = Date.parse(expiry);
    return Number.isNaN(at) ? null : at;
  } catch {
    return null;
  }
}

/** Si el enlace aguanta al menos `margin` mas. Un enlace sin caducidad conocida vale. */
export function isSignedUrlFresh(
  url: string | null | undefined,
  margin = SIGNED_URL_MARGIN_MS,
  now = Date.now(),
): boolean {
  if (!url) return true;
  const expiresAt = signedUrlExpiresAt(url);
  return expiresAt === null || expiresAt - now > margin;
}

/**
 * Cuanto puede servirse de cache una respuesta que trae estos enlaces: el tope `maxMs`, o
 * menos si alguno caduca antes. Nunca negativo: un enlace ya vencido pide releer ya.
 */
export function signedUrlsStaleTime(
  urls: Array<string | null | undefined>,
  maxMs: number,
  margin = SIGNED_URL_MARGIN_MS,
  now = Date.now(),
): number {
  let stale = maxMs;
  for (const url of urls) {
    if (!url) continue;
    const expiresAt = signedUrlExpiresAt(url);
    if (expiresAt !== null) stale = Math.min(stale, expiresAt - margin - now);
  }
  return Math.max(stale, 0);
}

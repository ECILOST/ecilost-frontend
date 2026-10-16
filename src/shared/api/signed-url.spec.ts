import { describe, expect, it } from 'vitest';
import { isSignedUrlFresh, signedUrlExpiresAt, signedUrlsStaleTime } from './signed-url';

const NOW = Date.parse('2026-10-14T20:00:00.000Z');
const url = (expiry: string) =>
  `https://stecilost.blob.core.windows.net/catalog-media-dev/a.png?sv=2024-08-04&se=${encodeURIComponent(expiry)}&sr=b&sp=r&sig=abc`;

describe('signed-url', () => {
  it('lee la caducidad del parametro se de Azure', () => {
    expect(signedUrlExpiresAt(url('2026-10-14T20:15:00Z'))).toBe(Date.parse('2026-10-14T20:15:00Z'));
  });

  it('una URL sin se no tiene caducidad conocida y se da por vigente', () => {
    expect(signedUrlExpiresAt('https://blob/a.png')).toBeNull();
    expect(isSignedUrlFresh('https://blob/a.png', 60_000, NOW)).toBe(true);
    expect(isSignedUrlFresh(null, 60_000, NOW)).toBe(true);
  });

  it('no da por vigente un enlace al que le queda menos que el margen', () => {
    expect(isSignedUrlFresh(url('2026-10-14T20:01:00Z'), 2 * 60_000, NOW)).toBe(false);
    expect(isSignedUrlFresh(url('2026-10-14T20:10:00Z'), 2 * 60_000, NOW)).toBe(true);
  });

  it('acorta la vida en cache al enlace que caduca primero, sin bajar de cero', () => {
    const urls = [url('2026-10-14T20:15:00Z'), url('2026-10-14T20:05:00Z'), null];
    expect(signedUrlsStaleTime(urls, 10 * 60_000, 2 * 60_000, NOW)).toBe(3 * 60_000);
    expect(signedUrlsStaleTime([url('2026-10-14T19:00:00Z')], 10 * 60_000, 0, NOW)).toBe(0);
    expect(signedUrlsStaleTime([], 10 * 60_000, 0, NOW)).toBe(10 * 60_000);
  });
});

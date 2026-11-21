import { describe, expect, it } from 'vitest';
import { LOGIN_ERRORS, resolveLoginError } from './auth-error';

describe('resolveLoginError', () => {
  it('sin motivo no inventa ningun error', () => {
    expect(resolveLoginError({ code: null })).toBeNull();
    expect(resolveLoginError({})).toBeNull();
  });

  it.each([
    ['access_denied', 'cancelled'],
    ['domain_not_allowed', 'account_not_allowed'],
    ['email_domain_not_allowed', 'account_not_allowed'],
    ['hd_mismatch', 'account_not_allowed'],
    ['forbidden', 'forbidden'],
    ['account_suspended', 'suspended'],
    ['email_not_verified', 'email_not_verified'],
    ['invalid_request', 'session_expired'],
    ['session_expired', 'session_expired'],
    ['server_error', 'server'],
    ['temporarily_unavailable', 'server'],
  ])('traduce %s a %s', (code, kind) => {
    expect(resolveLoginError({ code })?.kind).toBe(kind);
  });

  it('un codigo desconocido cae en el error generico sin mostrarse', () => {
    const error = resolveLoginError({ code: '<script>x</script>' });
    expect(error?.kind).toBe('server');
    expect(`${error?.title} ${error?.message}`).not.toContain('script');
  });

  it('no confunde propiedades heredadas con codigos', () => {
    expect(resolveLoginError({ code: 'constructor' })?.kind).toBe('server');
    expect(resolveLoginError({ code: '__proto__' })?.kind).toBe('server');
  });

  it('sin conexion gana a cualquier otro motivo', () => {
    expect(
      resolveLoginError({ code: 'account_suspended', online: false, sessionExpired: true })
        ?.kind,
    ).toBe('offline');
  });

  it('la sesion caducada se explica cuando no hay otro motivo', () => {
    expect(resolveLoginError({ sessionExpired: true })?.kind).toBe('session_expired');
    expect(resolveLoginError({ code: 'access_denied', sessionExpired: true })?.kind).toBe(
      'cancelled',
    );
  });

  it('una cuenta rechazada sugiere otra cuenta de Google sin exigir un dominio', () => {
    const error = resolveLoginError({ code: 'domain_not_allowed' });
    expect(error?.hint).toMatch(/cualquier cuenta de google/i);
    expect(`${error?.title} ${error?.message} ${error?.hint}`).not.toMatch(/escuelaing/);
  });

  it('todo mensaje dice que paso, que hacer y ofrece reintentar, sin jerga tecnica', () => {
    for (const error of Object.values(LOGIN_ERRORS)) {
      expect(error.title.length).toBeGreaterThan(0);
      expect(error.message.length).toBeGreaterThan(0);
      expect(error.retryLabel.length).toBeGreaterThan(0);
      expect(`${error.title} ${error.message}`).not.toMatch(
        /\b(\d{3}|error|token|request|timeout|null|undefined)\b/i,
      );
    }
  });
});

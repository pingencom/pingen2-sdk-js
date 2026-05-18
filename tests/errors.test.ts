import {
  PingenError,
  PingenBadRequestError,
  PingenUnauthorizedError,
  PingenForbiddenError,
  PingenNotFoundError,
  PingenMethodNotAllowedError,
  PingenNotAcceptableError,
  PingenConflictError,
  PingenGoneError,
  PingenUnsupportedMediaError,
  PingenUnprocessableEntityError,
  PingenDependencyError,
  PingenRateLimitError,
  PingenServerError,
  PingenServiceUnavailableError,
  PingenTimeoutError,
  AuthenticationError,
  ValidationError,
  WebhookSignatureError,
  classifyFetchError,
  createPingenError,
} from '../src/errors';

describe('PingenError base', () => {
  test('captures status, body, requestId, retryAfterMs', () => {
    const err = new PingenError('boom', 500, { error: 'x' }, 'req-1', 1500);
    expect(err.status).toBe(500);
    expect(err.body).toEqual({ error: 'x' });
    expect(err.requestId).toBe('req-1');
    expect(err.retryAfterMs).toBe(1500);
    expect(err.message).toBe('boom');
  });

  test('defaults body to null and leaves requestId/retryAfterMs undefined', () => {
    const err = new PingenError('boom', 500);
    expect(err.body).toBeNull();
    expect(err.requestId).toBeUndefined();
    expect(err.retryAfterMs).toBeUndefined();
  });

  test('name reflects the actual subclass via this.constructor.name', () => {
    expect(new PingenError('m', 500).name).toBe('PingenError');
    expect(new PingenNotFoundError('m', 404).name).toBe('PingenNotFoundError');
    expect(new PingenRateLimitError('m', 429).name).toBe('PingenRateLimitError');
  });
});

describe('createPingenError dispatch', () => {
  test.each([
    [400, PingenBadRequestError],
    [401, PingenUnauthorizedError],
    [403, PingenForbiddenError],
    [404, PingenNotFoundError],
    [405, PingenMethodNotAllowedError],
    [406, PingenNotAcceptableError],
    [409, PingenConflictError],
    [410, PingenGoneError],
    [415, PingenUnsupportedMediaError],
    [422, PingenUnprocessableEntityError],
    [424, PingenDependencyError],
    [429, PingenRateLimitError],
    [500, PingenServerError],
    [503, PingenServiceUnavailableError],
  ])('status %d → %s', (status, Cls) => {
    const err = createPingenError('msg', status);
    expect(err).toBeInstanceOf(Cls);
    expect(err).toBeInstanceOf(PingenError);
    expect(err.status).toBe(status);
  });

  test('unmapped status falls back to base PingenError with status preserved', () => {
    const err = createPingenError('weird', 418);
    expect(err.constructor).toBe(PingenError);
    expect(err.status).toBe(418);
  });

  test('forwards body, requestId, and retryAfterMs to the constructed subclass', () => {
    const err = createPingenError('rate', 429, { code: 'rate' }, 'req-9', 5000);
    expect(err).toBeInstanceOf(PingenRateLimitError);
    expect(err.body).toEqual({ code: 'rate' });
    expect(err.requestId).toBe('req-9');
    expect(err.retryAfterMs).toBe(5000);
  });
});

describe('local errors (no HTTP exchange)', () => {
  test('AuthenticationError uses status 0 and is a PingenError', () => {
    const err = new AuthenticationError('Missing creds');
    expect(err).toBeInstanceOf(PingenError);
    expect(err.status).toBe(0);
    expect(err.name).toBe('AuthenticationError');
    expect(err.message).toBe('Missing creds');
  });

  test('ValidationError carries field + message and extends PingenError', () => {
    const err = new ValidationError('deliveryProduct', 'deliveryProduct is required');
    expect(err).toBeInstanceOf(PingenError);
    expect(err.field).toBe('deliveryProduct');
    expect(err.message).toBe('deliveryProduct is required');
    expect(err.status).toBe(0);
    expect(err.name).toBe('ValidationError');
  });

  test('WebhookSignatureError extends PingenError with status 0', () => {
    const err = new WebhookSignatureError('bad sig');
    expect(err).toBeInstanceOf(PingenError);
    expect(err.status).toBe(0);
    expect(err.name).toBe('WebhookSignatureError');
  });
});

describe('PingenTimeoutError marker', () => {
  test('is a PingenError with the caller-provided status (typically 0)', () => {
    const err = new PingenTimeoutError('timeout', 0);
    expect(err).toBeInstanceOf(PingenError);
    expect(err.name).toBe('PingenTimeoutError');
    expect(err.status).toBe(0);
  });
});

describe('classifyFetchError', () => {
  test('direct TimeoutError → PingenTimeoutError with contextual message', () => {
    const e = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    const result = classifyFetchError('Pingen API GET /x', e);
    expect(result).toBeInstanceOf(PingenTimeoutError);
    expect(result.message).toBe('Pingen API GET /x timed out.');
    expect(result.status).toBe(0);
  });

  test('direct AbortError → PingenTimeoutError', () => {
    const e = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(classifyFetchError('ctx', e)).toBeInstanceOf(PingenTimeoutError);
  });

  test('timeout wrapped inside fetch TypeError via .cause → PingenTimeoutError', () => {
    const cause = Object.assign(new Error('inner'), { name: 'TimeoutError' });
    const e = Object.assign(new TypeError('fetch failed'), { cause });
    expect(classifyFetchError('ctx', e)).toBeInstanceOf(PingenTimeoutError);
  });

  test('unrecognised network Error → generic PingenError with the raw error in body', () => {
    const cause = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const result = classifyFetchError('Pingen auth request', cause);
    expect(result).toBeInstanceOf(PingenError);
    expect(result).not.toBeInstanceOf(PingenTimeoutError);
    expect(result.message).toBe('Pingen auth request failed unexpectedly.');
    expect(result.body).toBe(cause);
    expect(result.status).toBe(0);
  });

  test('fetch TypeError with non-abort cause → generic PingenError (cause preserved in body)', () => {
    const cause = new Error('ENOTFOUND');
    const e = Object.assign(new TypeError('fetch failed'), { cause });
    const result = classifyFetchError('ctx', e);
    expect(result).not.toBeInstanceOf(PingenTimeoutError);
    expect(result.body).toBe(e);
  });

  test('non-Error inputs fall through to generic PingenError (no string coercion)', () => {
    const result = classifyFetchError('ctx', 'plain string');
    expect(result).toBeInstanceOf(PingenError);
    expect(result.body).toBe('plain string');
  });

  test('a non-Error value with .cause that looks abort-y is NOT a timeout (positive check only)', () => {
    // Plain objects are ignored — only real Error instances qualify, so an attacker can't
    // smuggle a "TimeoutError" by handing us a plain object.
    const fake = { name: 'TimeoutError', message: 'spoofed' };
    expect(classifyFetchError('ctx', fake)).not.toBeInstanceOf(PingenTimeoutError);
  });
});

import {
  computeBackoffMs,
  isRetryableStatus,
  shouldAttachIdempotencyKey,
  sleep,
  type HttpMethod,
} from '../../src/utils/retry';

describe('isRetryableStatus', () => {
  it.each<[HttpMethod, number, boolean]>([
    ['GET', 429, true],
    ['POST', 429, true],
    ['PUT', 429, true],
    ['DELETE', 429, true],
    ['GET', 500, true],
    ['PATCH', 502, true],
    ['POST', 503, true],
    ['DELETE', 504, true],
    ['GET', 400, false],
    ['POST', 401, false],
    ['GET', 404, false],
    ['GET', 200, false],
    ['POST', 201, false],
  ])('%s %i → %p', (method, status, expected) => {
    expect(isRetryableStatus(method, status)).toBe(expected);
  });
});

describe('shouldAttachIdempotencyKey', () => {
  it.each<[HttpMethod, boolean]>([
    ['POST', true],
    ['PATCH', true],
    ['GET', false],
    ['PUT', false],
    ['DELETE', false],
  ])('%s → %p', (method, expected) => {
    expect(shouldAttachIdempotencyKey(method)).toBe(expected);
  });
});

describe('computeBackoffMs', () => {
  it('uses Retry-After when present and > base backoff', () => {
    // 5s retry-after, attempt 0 → exponential is 250ms → retry-after wins
    const ms = computeBackoffMs('5', 0);
    expect(ms).toBeGreaterThanOrEqual(5000 * 0.8);
    expect(ms).toBeLessThanOrEqual(5000 * 1.2);
  });

  it('uses exponential backoff when Retry-After missing', () => {
    // attempt 3 → 250 * 2^3 = 2000ms (+/- 20%)
    const ms = computeBackoffMs(undefined, 3);
    expect(ms).toBeGreaterThanOrEqual(1600);
    expect(ms).toBeLessThanOrEqual(2400);
  });

  it.each([
    ['negative', '-5'],
    ['zero', '0'],
    ['non-numeric', 'later'],
    ['empty', ''],
  ])('ignores invalid Retry-After: %s', (_label, value) => {
    // should fall back to exponential backoff; attempt 0 → ~250ms
    const ms = computeBackoffMs(value, 0);
    expect(ms).toBeGreaterThanOrEqual(200);
    expect(ms).toBeLessThanOrEqual(300);
  });

  it('caps Retry-After at 10s', () => {
    // 60s server-suggested should be clamped to 10s (+/- 20%)
    const ms = computeBackoffMs('60', 0);
    expect(ms).toBeLessThanOrEqual(12_000);
  });
});

describe('sleep', () => {
  it('waits at least the specified number of ms', async () => {
    const start = Date.now();
    await sleep(15);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });
});

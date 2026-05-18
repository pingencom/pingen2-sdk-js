import nock from 'nock';
import { OAuth } from '../src/oauth';
import { AuthenticationError } from '../src/errors';

const PROD = 'https://api.pingen.com';
const STAGING_API = 'https://api-staging.pingen.com';

describe('OAuth constructor', () => {
  test('rejects empty clientId', () => {
    expect(() => new OAuth({ clientId: '', clientSecret: 'sec' })).toThrow(AuthenticationError);
    expect(() => new OAuth({ clientId: '', clientSecret: 'sec' })).toThrow(/clientId and clientSecret/);
  });

  test('rejects empty clientSecret', () => {
    expect(() => new OAuth({ clientId: 'cid', clientSecret: '' })).toThrow(AuthenticationError);
  });
});

describe('OAuth.getAccessToken', () => {
  afterEach(() => nock.cleanAll());

  const tokenOk = (accessToken: string, expiresIn = 3600) =>
    nock(PROD)
      .post('/auth/access-tokens')
      .reply(200, { access_token: accessToken, expires_in: expiresIn, token_type: 'Bearer' });

  test('fetches a fresh token and caches it within expiry', async () => {
    tokenOk('TOK1');
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    expect(await oauth.getAccessToken()).toBe('TOK1');
    // Second call — no new nock interceptor; the in-memory cache must serve it.
    expect(await oauth.getAccessToken()).toBe('TOK1');
  });

  test('separate OAuth instances keep separate caches', async () => {
    tokenOk('TOK-A');
    tokenOk('TOK-B');
    const a = new OAuth({ clientId: 'A', clientSecret: 'sec' });
    const b = new OAuth({ clientId: 'B', clientSecret: 'sec' });
    expect(await a.getAccessToken()).toBe('TOK-A');
    expect(await b.getAccessToken()).toBe('TOK-B');
    expect(await a.getAccessToken()).toBe('TOK-A'); // a's cache untouched
  });

  test('staging hits the staging endpoint', async () => {
    nock(STAGING_API).post('/auth/access-tokens').reply(200, { access_token: 'STG', expires_in: 3600 });
    const staging = new OAuth({ clientId: 'cid', clientSecret: 'sec', useStaging: true });
    expect(await staging.getAccessToken()).toBe('STG');
  });

  test('deduplicates concurrent cold-start callers via pendingRequest', async () => {
    let resolveBody!: (body: string) => void;
    const pending = new Promise<string>((resolve) => {
      resolveBody = resolve;
    });
    // Only ONE nock interceptor. If dedup works, both callers share the same in-flight Promise.
    nock(PROD)
      .post('/auth/access-tokens')
      .reply(async () => {
        const body = await pending;
        return [200, body];
      });
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    const first = oauth.getAccessToken();
    const second = oauth.getAccessToken();
    resolveBody(JSON.stringify({ access_token: 'SHARED', expires_in: 3600 }));
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe('SHARED');
    expect(b).toBe('SHARED');
  });

  test('evicts expired cached entry and re-fetches on the next call', async () => {
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'STALE', expires_in: 0 });
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'FRESH', expires_in: 3600 });
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    expect(await oauth.getAccessToken()).toBe('STALE');
    // expires_in=0 minus buffer → already expired; next call must re-fetch
    expect(await oauth.getAccessToken()).toBe('FRESH');
  });

  test('clears pendingRequest on fetch failure so the next call retries', async () => {
    nock(PROD).post('/auth/access-tokens').reply(500, 'server');
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    await expect(oauth.getAccessToken()).rejects.toThrow();
    // Second call must hit the network again — if pendingRequest stayed, we'd get the same rejection.
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'RECOVER', expires_in: 3600 });
    expect(await oauth.getAccessToken()).toBe('RECOVER');
  });

  test('surfaces non-2xx auth response with the actual status', async () => {
    nock(PROD).post('/auth/access-tokens').reply(401, { error: 'invalid_client' });
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'WRONG' });
    await expect(oauth.getAccessToken()).rejects.toThrow(/auth endpoint returned 401/);
  });

  test('falls back to statusText when the auth error body is empty', async () => {
    // Empty body forces the `text || res.statusText` ternary onto its right branch.
    nock(PROD).post('/auth/access-tokens').reply(503, '');
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    await expect(oauth.getAccessToken()).rejects.toThrow(/auth endpoint returned 503/);
  });

  test('wraps an unrecognised network error as generic PingenError with cause attached', async () => {
    const { PingenError, PingenTimeoutError } = await import('../src/errors');
    const cause = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    nock(PROD).post('/auth/access-tokens').replyWithError(cause);
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    const err = await oauth.getAccessToken().catch((e) => e);
    expect(err).toBeInstanceOf(PingenError);
    expect(err).not.toBeInstanceOf(PingenTimeoutError);
    expect(err.message).toMatch(/Pingen auth request failed unexpectedly/);
    // The raw cause is exposed via `body` for diagnostics (we don't stringify it).
    expect(err.body).toBeDefined();
  });

  test('wraps a timeout/abort as PingenTimeoutError', async () => {
    const { PingenTimeoutError } = await import('../src/errors');
    const timeoutLike = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    nock(PROD).post('/auth/access-tokens').replyWithError(timeoutLike);
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    const err = await oauth.getAccessToken().catch((e) => e);
    expect(err).toBeInstanceOf(PingenTimeoutError);
    expect(err.message).toMatch(/Pingen auth request timed out/);
  });

  test('throws PingenError when the auth endpoint returns non-JSON 2xx body', async () => {
    nock(PROD).post('/auth/access-tokens').reply(200, '<html>maintenance</html>', {
      'Content-Type': 'text/html',
    });
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    await expect(oauth.getAccessToken()).rejects.toThrow(/non-JSON body/);
  });
});

describe('OAuth.invalidate', () => {
  afterEach(() => nock.cleanAll());

  test('forces a fresh fetch on the next getAccessToken call', async () => {
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'A', expires_in: 3600 });
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'A2', expires_in: 3600 });
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    expect(await oauth.getAccessToken()).toBe('A');
    oauth.invalidate();
    expect(await oauth.getAccessToken()).toBe('A2');
  });

  test('does not affect other OAuth instances', async () => {
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'A', expires_in: 3600 });
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'B', expires_in: 3600 });
    const a = new OAuth({ clientId: 'A', clientSecret: 'sec' });
    const b = new OAuth({ clientId: 'B', clientSecret: 'sec' });
    await a.getAccessToken();
    await b.getAccessToken();

    a.invalidate();

    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'A2', expires_in: 3600 });
    expect(await a.getAccessToken()).toBe('A2'); // re-fetched
    expect(await b.getAccessToken()).toBe('B'); // still cached
  });

  test('is a no-op when no token has been cached yet', () => {
    const oauth = new OAuth({ clientId: 'cid', clientSecret: 'sec' });
    expect(() => oauth.invalidate()).not.toThrow();
  });
});

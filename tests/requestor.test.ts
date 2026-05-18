import nock from 'nock';
import { ApiRequestor } from '../src/requestor';
import {
  PingenError,
  PingenNotFoundError,
  PingenRateLimitError,
  PingenServiceUnavailableError,
  PingenTimeoutError,
} from '../src/errors';
import { USER_AGENT } from '../src/constants';
import { API, FIXTURE_PDF, TOKEN } from './helpers';

describe('ApiRequestor retry + idempotency', () => {
  afterEach(() => nock.cleanAll());

  const reqWith = (maxAttempts = 3) => new ApiRequestor(TOKEN, { maxAttempts });

  test('User-Agent header carries the SDK identifier from constants', async () => {
    let ua: string | undefined;
    nock(API)
      .get('/ua')
      .reply(function () {
        ua = this.req.headers['user-agent'] as string;
        return [200, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    await reqWith().get('/ua');
    expect(ua).toBe(USER_AGENT);
  });

  test('omits Authorization header when token is null (pre-ensureToken state)', async () => {
    let auth: string | undefined;
    nock(API)
      .get('/no-auth')
      .reply(function () {
        auth = this.req.headers['authorization'] as string | undefined;
        return [200, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    await new ApiRequestor(null).get('/no-auth');
    expect(auth).toBeUndefined();
  });

  test('uses default maxAttempts (3) when not provided', async () => {
    nock(API).get('/default').times(3).reply(503, 'down');
    await expect(new ApiRequestor(TOKEN).get('/default')).rejects.toThrow(PingenError);
  });

  test('retries on 5xx and succeeds', async () => {
    nock(API).get('/health').reply(503, 'bad');
    nock(API)
      .get('/health')
      .reply(200, { data: { id: 'x', type: 'foo', attributes: {} } });
    expect((await reqWith().get('/health')).statusCode).toBe(200);
  });

  test('retries on 429 honouring Retry-After', async () => {
    nock(API).get('/ping').reply(429, 'slow', { 'retry-after': '1' });
    nock(API)
      .get('/ping')
      .reply(200, { data: { id: 'x', type: 'foo', attributes: {} } });
    expect((await reqWith().get('/ping')).statusCode).toBe(200);
  });

  test('stops retrying after max attempts and throws PingenError', async () => {
    nock(API).get('/fail').times(3).reply(503, 'down');
    await expect(reqWith(3).get('/fail')).rejects.toThrow(PingenError);
  });

  test('throws subclass with parsed retryAfterMs when terminal response carries Retry-After', async () => {
    // maxAttempts=1 → throws on the first failure without sleeping, so the test stays fast.
    nock(API).get('/rl').reply(429, { code: 'slow' }, { 'retry-after': '7' });
    const err = await reqWith(1)
      .get('/rl')
      .catch((e) => e);
    expect(err).toBeInstanceOf(PingenRateLimitError);
    expect(err.status).toBe(429);
    expect(err.retryAfterMs).toBe(7000);
  });

  test('throws subclass with retryAfterMs undefined when Retry-After is malformed', async () => {
    nock(API).get('/bad-ra').reply(503, { code: 'down' }, { 'retry-after': 'soon' });
    const err = await reqWith(1)
      .get('/bad-ra')
      .catch((e) => e);
    expect(err).toBeInstanceOf(PingenServiceUnavailableError);
    expect(err.retryAfterMs).toBeUndefined();
  });

  test('throws PingenNotFoundError on 404 with parsed JSON body and requestId', async () => {
    nock(API)
      .get('/missing')
      .reply(404, { errors: [{ code: 'not_found' }] }, { 'x-request-id': 'req-404' });
    const err = await reqWith()
      .get('/missing')
      .catch((e) => e);
    expect(err).toBeInstanceOf(PingenNotFoundError);
    expect(err.body).toEqual({ errors: [{ code: 'not_found' }] });
    expect(err.requestId).toBe('req-404');
  });

  test('does not retry on 4xx other than 429', async () => {
    nock(API).get('/nope').reply(404, 'gone');
    await expect(reqWith().get('/nope')).rejects.toThrow(PingenError);
  });

  test('attaches Idempotency-Key on POST and reuses it across retries', async () => {
    const keysSeen: string[] = [];
    nock(API)
      .post('/create')
      .times(2)
      .reply(function (_uri: string) {
        keysSeen.push(this.req.headers['idempotency-key'] as string);
        return keysSeen.length < 2 ? [500, 'boom'] : [201, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    expect((await reqWith().post('/create', '{}')).statusCode).toBe(201);
    expect(keysSeen[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(keysSeen[0]).toBe(keysSeen[1]);
  });

  test('attaches Idempotency-Key on PATCH', async () => {
    let seen: string | undefined;
    nock(API)
      .patch('/p')
      .reply(function () {
        seen = this.req.headers['idempotency-key'] as string;
        return [200, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    await reqWith().patch('/p', '{}');
    expect(seen).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('does NOT attach Idempotency-Key on GET', async () => {
    let seen: string | undefined;
    nock(API)
      .get('/g')
      .reply(function () {
        seen = this.req.headers['idempotency-key'] as string | undefined;
        return [200, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    await reqWith().get('/g');
    expect(seen).toBeUndefined();
  });

  test('respects a caller-provided Idempotency-Key', async () => {
    let seen: string | undefined;
    nock(API)
      .post('/create')
      .reply(function () {
        seen = this.req.headers['idempotency-key'] as string;
        return [201, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    await reqWith().post('/create', '{}', { 'Idempotency-Key': 'caller-supplied' });
    expect(seen).toBe('caller-supplied');
  });

  test('refuses 3xx redirects as success (status < 300)', async () => {
    // Pre-fix this would have been treated as success and crashed in JSON.parse. Now: throw.
    nock(API).get('/redir').reply(304, '');
    await expect(reqWith().get('/redir')).rejects.toThrow(PingenError);
  });

  test('wraps unrecognised fetch network error as generic PingenError with cause in body', async () => {
    nock(API)
      .get('/net')
      .replyWithError(Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }));
    const err = await reqWith()
      .get('/net')
      .catch((e) => e);
    expect(err).toBeInstanceOf(PingenError);
    expect(err).not.toBeInstanceOf(PingenTimeoutError);
    expect(err.message).toMatch(/Pingen API GET .* failed unexpectedly/);
    expect(err.body).toBeDefined();
  });

  test('wraps fetch timeout/abort rejection as PingenTimeoutError', async () => {
    const timeoutLike = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    nock(API).get('/slow').replyWithError(timeoutLike);
    const err = await reqWith()
      .get('/slow')
      .catch((e) => e);
    expect(err).toBeInstanceOf(PingenTimeoutError);
    expect(err.message).toMatch(/Pingen API GET .* timed out/);
  });

  test('omits Content-Type on GET (no body to describe)', async () => {
    let contentType: string | undefined;
    nock(API)
      .get('/no-ct')
      .reply(function () {
        contentType = this.req.headers['content-type'] as string | undefined;
        return [200, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    await reqWith().get('/no-ct');
    expect(contentType).toBeUndefined();
  });

  test('sets Content-Type on POST (body present)', async () => {
    let contentType: string | undefined;
    nock(API)
      .post('/with-ct')
      .reply(function () {
        contentType = this.req.headers['content-type'] as string | undefined;
        return [201, { data: { id: 'x', type: 'foo', attributes: {} } }];
      });
    await reqWith().post('/with-ct', '{}');
    expect(contentType).toBe('application/vnd.api+json');
  });
});

describe('ApiRequestor.stream (file download)', () => {
  afterEach(() => nock.cleanAll());
  const r = new ApiRequestor(TOKEN);

  test('returns body on 2xx', async () => {
    nock(API).get('/file').reply(200, '%PDF-1.4 content');
    expect(await r.stream('/file')).toContain('%PDF');
  });

  test('throws on non-2xx instead of silently returning the error body as if it were content', async () => {
    nock(API)
      .get('/missing-file')
      .reply(404, { errors: [{ code: 'not_found' }] }, { 'x-request-id': 'req-dl' });
    const err = await r.stream('/missing-file').catch((e) => e);
    expect(err).toBeInstanceOf(PingenNotFoundError);
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ errors: [{ code: 'not_found' }] });
    expect(err.requestId).toBe('req-dl');
  });

  test('wraps unrecognised network error as generic PingenError with cause in body', async () => {
    nock(API)
      .get('/file-net')
      .replyWithError(Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' }));
    const err = await r.stream('/file-net').catch((e) => e);
    expect(err).toBeInstanceOf(PingenError);
    expect(err.message).toMatch(/File download failed unexpectedly/);
    expect(err.body).toBeDefined();
  });
});

describe('ApiRequestor.put (signed-URL upload)', () => {
  afterEach(() => nock.cleanAll());
  const r = new ApiRequestor(TOKEN);

  test('resolves on 2xx', async () => {
    nock('https://signed.example.com').put('/upload').reply(201);
    await expect(r.put('https://signed.example.com/upload', FIXTURE_PDF)).resolves.toBeUndefined();
  });

  test('throws on non-2xx (no silent failure)', async () => {
    nock('https://signed.example.com').put('/fail').reply(500, 'oops');
    await expect(r.put('https://signed.example.com/fail', FIXTURE_PDF)).rejects.toThrow(PingenError);
  });

  test('wraps unrecognised fetch error as generic PingenError with cause in body', async () => {
    nock('https://signed.example.com')
      .put('/net')
      .replyWithError(Object.assign(new Error('EAI_AGAIN'), { code: 'EAI_AGAIN' }));
    const err = await r.put('https://signed.example.com/net', FIXTURE_PDF).catch((e) => e);
    expect(err).toBeInstanceOf(PingenError);
    expect(err.message).toMatch(/File upload to signed URL failed unexpectedly/);
    expect(err.body).toBeDefined();
  });
});

describe('ApiRequestor on401 hook', () => {
  afterEach(() => nock.cleanAll());

  test('invokes on401 once and retries with the returned token', async () => {
    nock(API).get('/me').matchHeader('authorization', 'Bearer stale').reply(401, 'expired');
    nock(API)
      .get('/me')
      .matchHeader('authorization', 'Bearer fresh')
      .reply(200, { data: { id: 'u', type: 'users', attributes: {} } });
    const r = new ApiRequestor('stale', { on401: async () => 'fresh' });
    expect((await r.get('/me')).statusCode).toBe(200);
  });

  test('propagates 401 when on401 returns undefined', async () => {
    nock(API).get('/me').reply(401, 'no-creds');
    const r = new ApiRequestor('stale', { on401: async () => undefined });
    await expect(r.get('/me')).rejects.toThrow(PingenError);
  });

  test('does not invoke on401 twice for the same logical request', async () => {
    let calls = 0;
    nock(API).get('/me').times(2).reply(401, 'still-bad');
    const r = new ApiRequestor('stale', {
      on401: async () => {
        calls += 1;
        return 'still-bad'; // server keeps rejecting even with refreshed token
      },
    });
    await expect(r.get('/me')).rejects.toThrow(PingenError);
    expect(calls).toBe(1);
  });
});

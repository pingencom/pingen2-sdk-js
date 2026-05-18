import nock from 'nock';
import { PingenClient } from '../src/client';
import {
  Letters,
  Batches,
  LetterEvents,
  BatchEvents,
  EbillEvents,
  EmailEvents,
  Organisations,
  Users,
  UserAssociations,
  Webhooks,
  Ebills,
  Emails,
} from '../src/resources';
import { API, ORG } from './helpers';

const PROD = 'https://api.pingen.com';
const STAGING = 'https://api-staging.pingen.com';

describe('PingenClient — resource accessors', () => {
  const client = new PingenClient('cid', 'sec');

  test.each([
    ['letters', () => client.letters(ORG), Letters],
    ['batches', () => client.batches(ORG), Batches],
    ['letterEvents', () => client.letterEvents(ORG), LetterEvents],
    ['batchEvents', () => client.batchEvents(ORG), BatchEvents],
    ['ebillEvents', () => client.ebillEvents(ORG), EbillEvents],
    ['emailEvents', () => client.emailEvents(ORG), EmailEvents],
    ['webhooks', () => client.webhooks(ORG), Webhooks],
    ['ebills', () => client.ebills(ORG), Ebills],
    ['emails', () => client.emails(ORG), Emails],
    ['organisations', () => client.organisations(), Organisations],
    ['users', () => client.users(), Users],
    ['userAssociations', () => client.userAssociations(), UserAssociations],
  ])('%s returns the right resource type', (_label, factory, Cls) => {
    expect(factory()).toBeInstanceOf(Cls);
  });

  test('shares a single ApiRequestor across resources (no re-instantiation)', () => {
    const a = (client.letters(ORG) as unknown as { requestor: object }).requestor;
    const b = (client.batches(ORG) as unknown as { requestor: object }).requestor;
    expect(a).toBe(b);
  });
});

describe('PingenClient — constructor forms', () => {
  afterEach(() => nock.cleanAll());

  test('positional form (clientId, clientSecret) hits production', async () => {
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'POS-TOKEN', expires_in: 3600 });
    nock(API)
      .get('/user')
      .matchHeader('authorization', 'Bearer POS-TOKEN')
      .reply(200, { data: { id: 'u', type: 'users', attributes: {} } });

    const client = new PingenClient('cid', 'sec');
    await client.ensureToken();
    expect((await client.users().getDetails()).statusCode).toBe(200);
  });

  test('positional form with useStaging=true routes to staging', async () => {
    nock(STAGING).post('/auth/access-tokens').reply(200, { access_token: 'STG-TOKEN', expires_in: 3600 });
    nock('https://api-staging.pingen.com')
      .get('/user')
      .matchHeader('authorization', 'Bearer STG-TOKEN')
      .reply(200, { data: { id: 'u', type: 'users', attributes: {} } });

    const client = new PingenClient('cid', 'sec', true);
    await client.ensureToken();
    expect((await client.users().getDetails()).statusCode).toBe(200);
  });

  test('config form accepts all options', async () => {
    nock(STAGING).post('/auth/access-tokens').reply(200, { access_token: 'CFG-TOKEN', expires_in: 3600 });
    nock('https://api-staging.pingen.com')
      .get('/user')
      .reply(200, { data: { id: 'u', type: 'users', attributes: {} } });

    const client = new PingenClient({
      clientId: 'cid',
      clientSecret: 'sec',
      useStaging: true,
      maxAttempts: 2,
      timeoutMs: 5000,
      uploadTimeoutMs: 30_000,
    });
    await client.ensureToken();
    expect((await client.users().getDetails()).statusCode).toBe(200);
  });
});

describe('PingenClient — auto refresh on 401', () => {
  afterEach(() => nock.cleanAll());

  test('on401 invalidates and re-fetches the token, then retries', async () => {
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'STALE', expires_in: 3600 });
    const client = new PingenClient('cid', 'sec');
    await client.ensureToken();

    nock(API)
      .get('/user')
      .matchHeader('authorization', 'Bearer STALE')
      .reply(401, { errors: { code: 'access_denied' } });
    nock(PROD).post('/auth/access-tokens').reply(200, { access_token: 'FRESH', expires_in: 3600 });
    nock(API)
      .get('/user')
      .matchHeader('authorization', 'Bearer FRESH')
      .reply(200, { data: { id: 'u', type: 'users', attributes: {} } });

    expect((await client.users().getDetails()).statusCode).toBe(200);
  });
});

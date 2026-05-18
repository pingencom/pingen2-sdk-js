import nock from 'nock';
import { Users, UserAssociations, type UserAttributes } from '../../../src/resources';
import { ApiRequestor } from '../../../src/requestor';
import { API, STAGING, ORG, TOKEN, requestor } from '../../helpers';

const stagingRequestor = () => new ApiRequestor(TOKEN, { useStaging: true });

describe('Users', () => {
  afterEach(() => nock.cleanAll());
  const userPayload = (id: string) => ({
    data: {
      id,
      type: 'users',
      attributes: { first_name: 'John', last_name: 'Doe', email: 'john@acme.com' },
    },
  });

  test('get_details', async () => {
    nock(API).get('/user').reply(200, userPayload('user001'));
    const res = (await new Users(requestor()).getDetails()).toResource<UserAttributes>();
    expect(res.attributes.email).toBe('john@acme.com');
  });

  test('staging routing', async () => {
    nock(STAGING).get('/user').reply(200, userPayload('user002'));
    expect((await new Users(stagingRequestor()).getDetails()).statusCode).toBe(200);
  });

  test('requestId is null when header missing', async () => {
    nock(API).get('/user').reply(200, userPayload('user003'));
    expect((await new Users(requestor()).getDetails()).requestId).toBeNull();
  });

  test('empty body becomes null data', async () => {
    nock(API).get('/user').reply(200, '');
    const r = await new Users(requestor()).getDetails();
    expect(r.data).toBeNull();
    expect(r.body).toBe('');
  });

  test('non-JSON success body falls through safeParse and is returned as raw string', async () => {
    // Some Pingen endpoints (e.g. file streams) return non-JSON bodies on 2xx — pre-fix this
    // crashed the response constructor with SyntaxError. Now: store the raw body untouched.
    nock(API).get('/user').reply(200, 'not-json-just-a-blob');
    const r = await new Users(requestor()).getDetails();
    expect(r.data).toBe('not-json-just-a-blob');
  });
});

describe('UserAssociations', () => {
  afterEach(() => nock.cleanAll());

  test('get_collection', async () => {
    nock(API)
      .get('/user/associations')
      .reply(200, {
        data: [
          {
            id: 'assoc001',
            type: 'user_associations',
            attributes: { role: 'owner' },
            relationships: {
              organisation: { data: { id: ORG, type: 'organisations' } },
              user: { data: { id: 'user001', type: 'users' } },
            },
          },
        ],
      });
    expect((await new UserAssociations(requestor()).getCollection()).statusCode).toBe(200);
  });

  test('staging routing', async () => {
    nock(STAGING).get('/user/associations').reply(200, { data: [] });
    expect((await new UserAssociations(stagingRequestor()).getCollection()).statusCode).toBe(200);
  });
});

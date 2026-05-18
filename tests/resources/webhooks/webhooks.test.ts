import nock from 'nock';
import { Webhooks, WebhookEventCategory, type WebhookAttributes } from '../../../src/resources';
import { PingenError } from '../../../src/errors';
import { API, STAGING, ORG, TOKEN, webhookJson, requestor } from '../../helpers';
import { ApiRequestor } from '../../../src/requestor';

describe('Webhooks', () => {
  afterEach(() => nock.cleanAll());
  const wh = () => new Webhooks(ORG, requestor());

  test('get_details', async () => {
    const id = 'wh000001-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API).get(`/organisations/${ORG}/webhooks/${id}`).reply(200, webhookJson(id), { 'X-Request-Id': 'req1' });
    const res = (await wh().getDetails(id)).toResource<WebhookAttributes>();
    expect(res.attributes.event_category).toBe('issues');
    expect(res.attributes.signing_key).toBe('d09a');
  });

  test('get_collection', async () => {
    nock(API)
      .get(`/organisations/${ORG}/webhooks`)
      .reply(200, { data: [webhookJson('wh1').data], meta: { total: 1 } });
    expect((await wh().getCollection()).statusCode).toBe(200);
  });

  test('create', async () => {
    const id = 'wh000002-xxxx-xxxx-xxxx-xxxxxxxxxx11';
    nock(API).post(`/organisations/${ORG}/webhooks`).reply(201, webhookJson(id));
    const r = await wh().create({
      eventCategory: WebhookEventCategory.Issues,
      url: 'https://valid-url',
      signingKey: 'd09a',
    });
    expect(r.statusCode).toBe(201);
  });

  test('delete', async () => {
    const id = 'wh000del-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API).delete(`/organisations/${ORG}/webhooks/${id}`).reply(204);
    expect((await wh().delete(id)).statusCode).toBe(204);
  });

  test('delete_unauthorized', async () => {
    const id = 'wh000del-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API)
      .delete(`/organisations/${ORG}/webhooks/${id}`)
      .reply(401, { errors: { code: 'access_denied' } });
    await expect(wh().delete(id)).rejects.toThrow(PingenError);
  });

  test('staging routing', async () => {
    const id = 'wh-stag1-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(STAGING).get(`/organisations/${ORG}/webhooks/${id}`).reply(200, webhookJson(id));
    expect((await new Webhooks(ORG, new ApiRequestor(TOKEN, { useStaging: true })).getDetails(id)).statusCode).toBe(
      200,
    );
  });
});

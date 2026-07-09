import nock from 'nock';
import { Organisations, type OrganisationAttributes, type OrganisationRelationships } from '../../../src/resources';
import { ApiRequestor } from '../../../src/requestor';
import { API, STAGING, TOKEN, organisationJson, requestor } from '../../helpers';

const stagingRequestor = () => new ApiRequestor(TOKEN, { useStaging: true });

describe('Organisations', () => {
  afterEach(() => nock.cleanAll());

  test('production routing', async () => {
    const id = 'orgxxxxx-xxxx-xxxx-xxxx-xxxxxxxxx001';
    nock(API).get(`/organisations/${id}`).reply(200, organisationJson(id));
    expect((await new Organisations(requestor()).getDetails(id)).statusCode).toBe(200);
  });

  test('staging get_details flattens attributes and relationships', async () => {
    const id = 'orgxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(STAGING).get(`/organisations/${id}`).reply(200, organisationJson(id));
    const res = (await new Organisations(stagingRequestor()).getDetails(id)).toResource<OrganisationAttributes>();
    expect(res.attributes.name).toBe('ACME GmbH');
    expect(res.attributes.billing_currency).toBe('CHF');
    expect((res.relationships as unknown as OrganisationRelationships).associations?.links).toBeDefined();
  });

  test('get_details with query params', async () => {
    const id = 'orgxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(STAGING)
      .get(`/organisations/${id}`)
      .query({ 'fields[organisations]': 'name,status' })
      .reply(200, organisationJson(id));
    const r = await new Organisations(stagingRequestor()).getDetails(id, { fields: { organisations: 'name,status' } });
    expect(r.statusCode).toBe(200);
  });

  test('get_collection', async () => {
    const id = 'orgxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx11';
    nock(STAGING)
      .get('/organisations')
      .reply(200, { data: [organisationJson(id).data], meta: { total: 1 } });
    const col = (await new Organisations(stagingRequestor()).getCollection()).toCollection<OrganisationAttributes>();
    expect(col.data[0].attributes.name).toBe('ACME GmbH');
  });
});

import nock from 'nock';
import {
  LetterEvents,
  BatchEvents,
  EbillEvents,
  EmailEvents,
  type EventAttributes,
  type EventRelationships,
} from '../../../src/resources';
import { API, STAGING, ORG, TOKEN, eventJson, requestor } from '../../helpers';
import { ApiRequestor } from '../../../src/requestor';

const stagingRequestor = () => new ApiRequestor(TOKEN, { useStaging: true });

describe('LetterEvents', () => {
  afterEach(() => nock.cleanAll());
  const le = () => new LetterEvents(ORG, requestor());
  const evCollectionJson = { data: [eventJson('ev001')], meta: { total: 1 } };
  const lid = 'letter01-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  test('get_collection for a specific letter', async () => {
    nock(API).get(`/organisations/${ORG}/deliveries/letters/${lid}/events`).reply(200, evCollectionJson);
    const col = (await le().getCollection(lid)).toCollection<EventAttributes>();
    expect(col.data[0].attributes.code).toBe('A01');
  });

  test.each([
    ['issues', (r: LetterEvents) => r.getIssueCollection()],
    ['undeliverable', (r: LetterEvents) => r.getUndeliverableCollection()],
    ['delivered', (r: LetterEvents) => r.getDeliveredCollection()],
    ['sent', (r: LetterEvents) => r.getSentCollection()],
  ] as const)('hits /events/%s feed', async (feed, fn) => {
    nock(API).get(`/organisations/${ORG}/deliveries/letters/events/${feed}`).reply(200, evCollectionJson);
    expect((await fn(le())).statusCode).toBe(200);
  });

  test('staging routing', async () => {
    nock(STAGING).get(`/organisations/${ORG}/deliveries/letters/${lid}/events`).reply(200, evCollectionJson);
    expect((await new LetterEvents(ORG, stagingRequestor()).getCollection(lid)).statusCode).toBe(200);
  });
});

describe('BatchEvents', () => {
  afterEach(() => nock.cleanAll());

  test('get_collection', async () => {
    const bid = 'batch001-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .get(`/organisations/${ORG}/batches/${bid}/events`)
      .reply(200, { data: [], meta: { total: 0 } });
    expect((await new BatchEvents(ORG, requestor()).getCollection(bid)).statusCode).toBe(200);
  });

  test('staging routing', async () => {
    const bid = 'batch002-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(STAGING)
      .get(`/organisations/${ORG}/batches/${bid}/events`)
      .reply(200, { data: [], meta: { total: 0 } });
    expect((await new BatchEvents(ORG, stagingRequestor()).getCollection(bid)).statusCode).toBe(200);
  });
});

// Shape used by Pingen's /ebills/{id}/events and /emails/{id}/events endpoints. Both return
// type `deliverables_events` with the same EventAttributes payload — only the relationship
// pointer (ebill / email) differs.
function deliverablesEventJson(id: string, relType: 'ebill' | 'email', relId: string) {
  return {
    id,
    type: 'deliverables_events',
    attributes: {
      code: 'undeliverable',
      name: 'Content failed inspection',
      producer: 'Pingen',
      location: '8051 Zürich, CH',
      has_image: false,
      data: ['string'],
      emitted_at: '2020-11-19T09:42:48+0100',
      created_at: '2020-11-19T09:42:48+0100',
      updated_at: '2020-11-19T09:42:48+0100',
    },
    relationships: {
      [relType]: {
        links: { related: 'string' },
        data: { id: relId, type: relType === 'ebill' ? 'ebills' : 'emails' },
      },
    },
    links: { self: 'string' },
  };
}

describe('EbillEvents', () => {
  afterEach(() => nock.cleanAll());
  const ee = () => new EbillEvents(ORG, requestor());
  const ebillId = 'ebill001-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  test('get_collection hits the ebill events feed and surfaces typed attributes', async () => {
    nock(API)
      .get(`/organisations/${ORG}/deliveries/ebills/${ebillId}/events`)
      .reply(200, { data: [deliverablesEventJson('ev-eb1', 'ebill', ebillId)], meta: { total: 1 } });
    const col = (await ee().getCollection(ebillId)).toCollection<EventAttributes>();
    expect(col.data[0].attributes.code).toBe('undeliverable');
    expect(col.data[0].resourceType).toBe('deliverables_events');
    const rels = col.data[0].relationships as unknown as EventRelationships;
    expect(rels.ebill?.data?.id).toBe(ebillId);
  });

  test('forwards query params (paging, filters)', async () => {
    nock(API)
      .get(`/organisations/${ORG}/deliveries/ebills/${ebillId}/events`)
      .query({ 'page[number]': '2' })
      .reply(200, { data: [], meta: { total: 0 } });
    expect((await ee().getCollection(ebillId, { 'page[number]': '2' })).statusCode).toBe(200);
  });

  test('staging routing', async () => {
    nock(STAGING)
      .get(`/organisations/${ORG}/deliveries/ebills/${ebillId}/events`)
      .reply(200, { data: [], meta: { total: 0 } });
    expect((await new EbillEvents(ORG, stagingRequestor()).getCollection(ebillId)).statusCode).toBe(200);
  });
});

describe('EmailEvents', () => {
  afterEach(() => nock.cleanAll());
  const ee = () => new EmailEvents(ORG, requestor());
  const emailId = 'email001-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  test('get_collection hits the email events feed and surfaces typed attributes', async () => {
    nock(API)
      .get(`/organisations/${ORG}/deliveries/emails/${emailId}/events`)
      .reply(200, { data: [deliverablesEventJson('ev-em1', 'email', emailId)], meta: { total: 1 } });
    const col = (await ee().getCollection(emailId)).toCollection<EventAttributes>();
    expect(col.data[0].attributes.code).toBe('undeliverable');
    expect(col.data[0].resourceType).toBe('deliverables_events');
    const rels = col.data[0].relationships as unknown as EventRelationships;
    expect(rels.email?.data?.id).toBe(emailId);
  });

  test('forwards query params', async () => {
    nock(API)
      .get(`/organisations/${ORG}/deliveries/emails/${emailId}/events`)
      .query({ 'page[number]': '3' })
      .reply(200, { data: [], meta: { total: 0 } });
    expect((await ee().getCollection(emailId, { 'page[number]': '3' })).statusCode).toBe(200);
  });

  test('staging routing', async () => {
    nock(STAGING)
      .get(`/organisations/${ORG}/deliveries/emails/${emailId}/events`)
      .reply(200, { data: [], meta: { total: 0 } });
    expect((await new EmailEvents(ORG, stagingRequestor()).getCollection(emailId)).statusCode).toBe(200);
  });
});

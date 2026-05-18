import nock from 'nock';
import { Ebills, type EbillAttributes } from '../../../src/resources';
import { PresetRelationship } from '../../../src/common';
import { PingenError, PingenNotFoundError } from '../../../src/errors';
import { API, STAGING, ORG, FIXTURE_PDF, ebillJson, stubFileUpload, requestor } from '../../helpers';
import { ApiRequestor } from '../../../src/requestor';
import { TOKEN } from '../../helpers';

describe('Ebills', () => {
  afterEach(() => nock.cleanAll());
  const eb = (useStaging = false) =>
    new Ebills(ORG, useStaging ? new ApiRequestor(TOKEN, { useStaging }) : requestor());

  test('get_details', async () => {
    const id = 'ebill001-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).get(`/organisations/${ORG}/deliveries/ebills/${id}`).reply(200, ebillJson(id));
    const res = (await eb().getDetails(id)).toResource<EbillAttributes>();
    expect(res.attributes.invoice_number).toBe('Invoice 8051');
    expect(res.attributes.invoice_value).toBe(1250.3);
  });

  test('get_collection', async () => {
    nock(API)
      .get(`/organisations/${ORG}/deliveries/ebills`)
      .reply(200, { data: [ebillJson('ebill001').data] });
    expect((await eb().getCollection()).statusCode).toBe(200);
  });

  test('create', async () => {
    const id = 'ebill002-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).post(`/organisations/${ORG}/deliveries/ebills`).reply(201, ebillJson(id));
    expect(
      (
        await eb().create({
          fileUrl: 'https://s3.ex/file',
          fileSignature: '$sig',
          fileOriginalName: 'lorem.pdf',
          autoSend: false,
        })
      ).statusCode,
    ).toBe(201);
  });

  test('create with metaData and preset', async () => {
    const id = 'ebill004-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    let bodySent: unknown;
    nock(API)
      .post(`/organisations/${ORG}/deliveries/ebills`, (body) => {
        bodySent = body;
        return true;
      })
      .reply(201, ebillJson(id));
    await eb().create({
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      fileOriginalName: 'lorem.pdf',
      autoSend: true,
      metaData: {
        invoice_number: 'INV-001',
        invoice_date: '2025-01-01',
        invoice_due_date: '2025-02-01',
        recipient_identifier: '411000100',
      },
      preset: new PresetRelationship('preset-123'),
    });
    const sent = bodySent as { data: { attributes: Record<string, unknown>; relationships: unknown } };
    expect((sent.data.attributes.meta_data as { invoice_number: string }).invoice_number).toBe('INV-001');
    expect(sent.data.relationships).toBeDefined();
  });

  test('upload_and_create', async () => {
    const scope = nock(API);
    stubFileUpload(scope);
    const id = 'ebill003-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    scope.post(`/organisations/${ORG}/deliveries/ebills`).reply(201, ebillJson(id));
    expect(
      (
        await eb().uploadAndCreate({
          filePath: FIXTURE_PDF,
          fileOriginalName: 'lorem.pdf',
          autoSend: false,
        })
      ).statusCode,
    ).toBe(201);
  });

  test('staging requestor routes to staging host', async () => {
    const id = 'ebill005-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(STAGING).get(`/organisations/${ORG}/deliveries/ebills/${id}`).reply(200, ebillJson(id));
    expect((await eb(true).getDetails(id)).statusCode).toBe(200);
  });

  test('cancel', async () => {
    const id = 'ebillcnl-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).patch(`/organisations/${ORG}/deliveries/ebills/${id}/cancel`).reply(202);
    expect((await eb().cancel(id)).statusCode).toBe(202);
  });

  test('delete', async () => {
    const id = 'ebilldel-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).delete(`/organisations/${ORG}/deliveries/ebills/${id}`).reply(204);
    expect((await eb().delete(id)).statusCode).toBe(204);
  });

  test('delete propagates 401 as PingenError', async () => {
    const id = 'ebilldel-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .delete(`/organisations/${ORG}/deliveries/ebills/${id}`)
      .reply(401, { errors: { code: 'access_denied' } });
    await expect(eb().delete(id)).rejects.toThrow(PingenError);
  });

  test('getFile returns the PDF body', async () => {
    const id = 'ebillfil-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).get(`/organisations/${ORG}/deliveries/ebills/${id}/file`).reply(200, '%PDF-1.4 content');
    expect(await eb().getFile(id)).toContain('%PDF');
  });

  test('getFile throws typed PingenError on 404 (no silent error-body return)', async () => {
    const id = 'ebillfil-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .get(`/organisations/${ORG}/deliveries/ebills/${id}/file`)
      .reply(404, { errors: [{ code: 'not_found' }] });
    await expect(eb().getFile(id)).rejects.toThrow(PingenNotFoundError);
  });
});

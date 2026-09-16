import nock from 'nock';
import { Emails, type EmailAttributes, type EmailMetaData } from '../../../src/resources';
import { PresetRelationship } from '../../../src/common';
import { PingenError, PingenNotFoundError } from '../../../src/errors';
import { API, STAGING, ORG, TOKEN, FIXTURE_PDF, emailJson, stubFileUpload, requestor } from '../../helpers';
import { ApiRequestor } from '../../../src/requestor';

describe('Emails', () => {
  afterEach(() => nock.cleanAll());
  const em = (useStaging = false) =>
    new Emails(ORG, useStaging ? new ApiRequestor(TOKEN, { useStaging }) : requestor());

  test('get_details', async () => {
    const id = 'email001-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).get(`/organisations/${ORG}/deliveries/emails/${id}`).reply(200, emailJson(id));
    const res = (await em().getDetails(id)).toResource<EmailAttributes>();
    expect(res.attributes.recipient_identifier).toBe('info@acme.com');
  });

  test('get_collection', async () => {
    nock(API)
      .get(`/organisations/${ORG}/deliveries/emails`)
      .reply(200, { data: [emailJson('email001').data] });
    expect((await em().getCollection()).statusCode).toBe(200);
  });

  test('create', async () => {
    const id = 'email002-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).post(`/organisations/${ORG}/deliveries/emails`).reply(201, emailJson(id));
    expect(
      (
        await em().create({
          fileUrl: 'https://s3.ex/file',
          fileSignature: '$sig',
          fileOriginalName: 'test.pdf',
          autoSend: false,
        })
      ).statusCode,
    ).toBe(201);
  });

  test('create with metaData and preset', async () => {
    const id = 'email004-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    let bodySent: unknown;
    nock(API)
      .post(`/organisations/${ORG}/deliveries/emails`, (body) => {
        bodySent = body;
        return true;
      })
      .reply(201, emailJson(id));
    const meta: EmailMetaData = {
      sender_name: 'ACME',
      recipient_email: 'test@test.com',
      recipient_name: 'Test',
      reply_email: 'reply@test.com',
      reply_name: 'Reply',
      subject: 'Test',
      content: 'Hello',
    };
    await em().create({
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      fileOriginalName: 'test.pdf',
      autoSend: true,
      metaData: meta,
      preset: new PresetRelationship('preset-456'),
    });
    const sent = bodySent as { data: { attributes: Record<string, unknown>; relationships: unknown } };
    expect((sent.data.attributes.meta_data as EmailMetaData).subject).toBe('Test');
    expect(sent.data.relationships).toBeDefined();
  });

  test('upload_and_create', async () => {
    const scope = nock(API);
    stubFileUpload(scope);
    const id = 'email003-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    scope.post(`/organisations/${ORG}/deliveries/emails`).reply(201, emailJson(id));
    expect(
      (
        await em().uploadAndCreate({
          filePath: FIXTURE_PDF,
          fileOriginalName: 'test.pdf',
          autoSend: false,
        })
      ).statusCode,
    ).toBe(201);
  });

  test('staging requestor routes to staging host', async () => {
    const id = 'email005-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(STAGING).get(`/organisations/${ORG}/deliveries/emails/${id}`).reply(200, emailJson(id));
    expect((await em(true).getDetails(id)).statusCode).toBe(200);
  });

  test('cancel', async () => {
    const id = 'emailcnl-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).patch(`/organisations/${ORG}/deliveries/emails/${id}/cancel`).reply(202);
    expect((await em().cancel(id)).statusCode).toBe(202);
  });

  test('delete', async () => {
    const id = 'emaildel-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).delete(`/organisations/${ORG}/deliveries/emails/${id}`).reply(204);
    expect((await em().delete(id)).statusCode).toBe(204);
  });

  test('delete propagates 401 as PingenError', async () => {
    const id = 'emaildel-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .delete(`/organisations/${ORG}/deliveries/emails/${id}`)
      .reply(401, { errors: { code: 'access_denied' } });
    await expect(em().delete(id)).rejects.toThrow(PingenError);
  });

  test('getFile returns the PDF body', async () => {
    const id = 'emailfil-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).get(`/organisations/${ORG}/deliveries/emails/${id}/file`).reply(200, '%PDF-1.4 content');
    expect(await em().getFile(id)).toContain('%PDF');
  });

  test('getFile throws typed PingenError on 404 (no silent error-body return)', async () => {
    const id = 'emailfil-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .get(`/organisations/${ORG}/deliveries/emails/${id}/file`)
      .reply(404, { errors: [{ code: 'not_found' }] });
    await expect(em().getFile(id)).rejects.toThrow(PingenNotFoundError);
  });
});

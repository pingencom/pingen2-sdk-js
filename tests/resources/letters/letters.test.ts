import nock from 'nock';
import { Letters, type LetterAttributes, type LetterRelationships } from '../../../src/resources';
import { PingenError, ValidationError } from '../../../src/errors';
import {
  AddressPosition,
  DeliveryProduct,
  PrintMode,
  PrintSpectrum,
  PaperType,
  PresetRelationship,
} from '../../../src/common';
import { API, STAGING, ORG, FIXTURE_PDF, letterJson, stubFileUpload, requestor } from '../../helpers';

describe('Letters', () => {
  afterEach(() => nock.cleanAll());

  const letters = (useStaging = false) => new Letters(ORG, requestor(useStaging));

  test('get_details', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API)
      .get(`/organisations/${ORG}/deliveries/letters/${id}`)
      .reply(200, letterJson(id), { 'Content-Type': 'application/vnd.api+json', 'X-Request-Id': 'req1' });
    const r = await letters().getDetails(id);
    expect(r.statusCode).toBe(200);
    expect(r.requestId).toBe('req1');
    const res = r.toResource<LetterAttributes>();
    expect(res.id).toBe(id);
    expect(res.attributes.delivery_product).toBe('fast');
    expect(res.attributes.tracking_number).toBe('98.1234.11');
  });

  test('get_collection', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .get(`/organisations/${ORG}/deliveries/letters`)
      .reply(200, {
        data: [letterJson(id).data],
        meta: { current_page: 1, last_page: 1, per_page: 20, from: 1, to: 1, total: 1 },
        links: { first: '/letters?page=1', last: '/letters?page=1', self: '/letters?page=1' },
      });
    const col = (await letters().getCollection()).toCollection<LetterAttributes>();
    expect(col.data).toHaveLength(1);
    expect(col.data[0].id).toBe(id);
    expect(col.meta?.total).toBe(1);
  });

  describe('autoSend validation', () => {
    const baseAuto = {
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      fileOriginalName: 'lorem.pdf',
      addressPosition: AddressPosition.Left,
      autoSend: true,
    };

    test.each([
      ['deliveryProduct', { ...baseAuto, printMode: PrintMode.Simplex, printSpectrum: PrintSpectrum.Color }],
      [
        'printMode',
        {
          ...baseAuto,
          deliveryProduct: DeliveryProduct.Fast,
          printSpectrum: PrintSpectrum.Color,
        },
      ],
      ['printSpectrum', { ...baseAuto, deliveryProduct: DeliveryProduct.Fast, printMode: PrintMode.Simplex }],
    ])('throws ValidationError when %s missing', (field, opts) => {
      const err = (() => {
        try {
          letters().create(opts);
          return null;
        } catch (e) {
          return e;
        }
      })();
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe(field);
    });
  });

  test('create with autoSend and delivery params', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx11';
    nock(API).post(`/organisations/${ORG}/deliveries/letters`).reply(201, letterJson(id), { 'X-Request-Id': 'req2' });
    const r = await letters().create({
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      fileOriginalName: 'lorem.pdf',
      addressPosition: AddressPosition.Left,
      autoSend: true,
      deliveryProduct: DeliveryProduct.Fast,
      printMode: PrintMode.Simplex,
      printSpectrum: PrintSpectrum.Color,
    });
    expect(r.statusCode).toBe(201);
    expect(r.toResource<LetterAttributes>().id).toBe(id);
  });

  test('create without autoSend', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx12';
    nock(API).post(`/organisations/${ORG}/deliveries/letters`).reply(201, letterJson(id));
    const r = await letters().create({
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      fileOriginalName: 'lorem.pdf',
      addressPosition: AddressPosition.Left,
      autoSend: false,
    });
    expect(r.statusCode).toBe(201);
  });

  test('create with metaData and preset wires relationships and attributes', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx13';
    let bodySent: unknown;
    nock(API)
      .post(`/organisations/${ORG}/deliveries/letters`, (body) => {
        bodySent = body;
        return true;
      })
      .reply(201, letterJson(id));
    await letters().create({
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      fileOriginalName: 'lorem.pdf',
      addressPosition: AddressPosition.Left,
      autoSend: false,
      deliveryProduct: DeliveryProduct.Fast,
      printMode: PrintMode.Simplex,
      printSpectrum: PrintSpectrum.Color,
      metaData: {
        recipient: { name: 'R', zip: '8000', city: 'Z', country: 'CH' },
        sender: { name: 'S', zip: '8000', city: 'Z', country: 'CH' },
      },
      preset: new PresetRelationship('preset-123'),
    });
    const sent = bodySent as { data: { attributes: Record<string, unknown>; relationships: unknown } };
    expect(sent.data.attributes.delivery_product).toBe('fast');
    expect(sent.data.attributes.meta_data).toBeDefined();
    expect(sent.data.relationships).toBeDefined();
  });

  test('upload_and_create', async () => {
    const scope = nock(API);
    stubFileUpload(scope);
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxx111';
    scope.post(`/organisations/${ORG}/deliveries/letters`).reply(201, letterJson(id));
    const r = await letters().uploadAndCreate({
      filePath: FIXTURE_PDF,
      fileOriginalName: 'lorem.pdf',
      addressPosition: AddressPosition.Left,
      autoSend: false,
    });
    expect(r.statusCode).toBe(201);
    expect(r.toResource<LetterAttributes>().id).toBe(id);
  });

  test('send', async () => {
    const id = 'testsend-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API)
      .patch(`/organisations/${ORG}/deliveries/letters/${id}/send`)
      .reply(200, letterJson(id), { 'X-Request-Id': 'req-send' });
    const r = await letters().send({
      letterId: id,
      deliveryProduct: DeliveryProduct.Fast,
      printMode: PrintMode.Simplex,
      printSpectrum: PrintSpectrum.Color,
    });
    expect(r.statusCode).toBe(200);
    expect(r.requestId).toBe('req-send');
  });

  test('cancel', async () => {
    const id = 'testsend-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API).patch(`/organisations/${ORG}/deliveries/letters/${id}/cancel`).reply(202);
    expect((await letters().cancel(id)).statusCode).toBe(202);
  });

  test('delete', async () => {
    const id = 'testdelx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API).delete(`/organisations/${ORG}/deliveries/letters/${id}`).reply(204);
    expect((await letters().delete(id)).statusCode).toBe(204);
  });

  test('delete_unauthorized', async () => {
    const id = 'testdelx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API)
      .delete(`/organisations/${ORG}/deliveries/letters/${id}`)
      .reply(401, { errors: { code: 'access_denied' } });
    await expect(letters().delete(id)).rejects.toThrow(PingenError);
  });

  test('edit', async () => {
    const id = 'testedit-xxxx-xxxx-xxxx-xxxxxxxxx551';
    nock(API).patch(`/organisations/${ORG}/deliveries/letters/${id}`).reply(200, letterJson(id));
    expect((await letters().edit(id, [PaperType.Normal, PaperType.Qr])).statusCode).toBe(200);
  });

  test('calculatePrice', async () => {
    nock(API)
      .post(`/organisations/${ORG}/deliveries/letters/price-calculator`)
      .reply(200, {
        data: { id: 'xx', type: 'letter_price_calculator', attributes: { currency: 'CHF', price: 12.12 } },
      });
    const res = (
      await letters().calculatePrice({
        country: 'CH',
        paperTypes: [PaperType.Normal, PaperType.Qr],
        printMode: PrintMode.Simplex,
        printSpectrum: PrintSpectrum.Color,
        deliveryProduct: DeliveryProduct.Fast,
      })
    ).toResource<{ currency: string; price: number }>();
    expect(res.attributes.currency).toBe('CHF');
  });

  test('getFile', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API).get(`/organisations/${ORG}/deliveries/letters/${id}/file`).reply(200, '%PDF-1.4 content');
    expect(await letters().getFile(id)).toContain('%PDF');
  });

  test('staging requestor routes to staging host', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(STAGING).get(`/organisations/${ORG}/deliveries/letters/${id}`).reply(200, letterJson(id));
    expect((await letters(true).getDetails(id)).statusCode).toBe(200);
  });

  test('typed relationships', async () => {
    const id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
    nock(API).get(`/organisations/${ORG}/deliveries/letters/${id}`).reply(200, letterJson(id));
    const rels = (await letters().getDetails(id)).toResource<LetterAttributes>()
      .relationships as unknown as LetterRelationships;
    expect(rels.organisation?.data?.id).toBe(ORG);
    expect(rels.batch?.data?.type).toBe('batches');
  });
});

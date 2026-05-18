import nock from 'nock';
import {
  Batches,
  BatchIcon,
  GroupingType,
  SplitType,
  SplitPosition,
  createBatchDeliveryProduct,
  type BatchAttributes,
  type BatchRelationships,
} from '../../../src/resources';
import { PingenError, ValidationError } from '../../../src/errors';
import { AddressPosition, DeliveryProduct, PrintMode, PrintSpectrum, PresetRelationship } from '../../../src/common';
import { API, ORG, FIXTURE_PDF, batchJson, stubFileUpload, requestor } from '../../helpers';

describe('Batches', () => {
  afterEach(() => nock.cleanAll());
  const batches = () => new Batches(ORG, requestor());

  test('get_details', async () => {
    const id = 'batch001-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).get(`/organisations/${ORG}/batches/${id}`).reply(200, batchJson(id));
    const res = (await batches().getDetails(id)).toResource<BatchAttributes>();
    expect(res.id).toBe(id);
    expect(res.attributes.name).toBe('Monthly Invoicing August 2022');
    expect((res.relationships as unknown as BatchRelationships).organisation?.data?.id).toBe(ORG);
  });

  test('get_collection', async () => {
    nock(API)
      .get(`/organisations/${ORG}/batches`)
      .reply(200, { data: [batchJson('xxxxxxxx').data], meta: { total: 1 } });
    const col = (await batches().getCollection()).toCollection<BatchAttributes>();
    expect(col.data).toHaveLength(1);
  });

  test('create with zip grouping', async () => {
    const id = 'batch002-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).post(`/organisations/${ORG}/batches`).reply(201, batchJson(id));
    const r = await batches().create({
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      name: 'Test',
      icon: BatchIcon.Campaign,
      fileOriginalName: 'lorem.pdf',
      addressPosition: AddressPosition.Left,
      groupingType: GroupingType.Zip,
      splitType: SplitType.Page,
    });
    expect(r.statusCode).toBe(201);
  });

  test('create with split options and preset wires all attributes', async () => {
    const id = 'batch004-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    let bodySent: unknown;
    nock(API)
      .post(`/organisations/${ORG}/batches`, (body) => {
        bodySent = body;
        return true;
      })
      .reply(201, batchJson(id));
    await batches().create({
      fileUrl: 'https://s3.ex/file',
      fileSignature: '$sig',
      name: 'Test',
      icon: BatchIcon.Campaign,
      fileOriginalName: 'lorem.pdf',
      addressPosition: AddressPosition.Left,
      groupingType: GroupingType.Merge,
      splitType: SplitType.Custom,
      splitSize: 5,
      splitSeparator: '---',
      splitPosition: SplitPosition.FirstPage,
      preset: new PresetRelationship('preset-123'),
    });
    const sent = bodySent as { data: { attributes: Record<string, unknown>; relationships: unknown } };
    expect(sent.data.attributes.grouping_options_split_size).toBe(5);
    expect(sent.data.attributes.grouping_options_split_separator).toBe('---');
    expect(sent.data.attributes.grouping_options_split_position).toBe('first_page');
    expect(sent.data.relationships).toBeDefined();
  });

  test('upload_and_create', async () => {
    const scope = nock(API);
    stubFileUpload(scope);
    const id = 'batch003-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    scope.post(`/organisations/${ORG}/batches`).reply(201, batchJson(id));
    expect(
      (
        await batches().uploadAndCreate({
          filePath: FIXTURE_PDF,
          name: 'Test',
          icon: BatchIcon.Campaign,
          fileOriginalName: 'lorem.pdf',
          addressPosition: AddressPosition.Left,
          groupingType: GroupingType.Zip,
          splitType: SplitType.Page,
        })
      ).statusCode,
    ).toBe(201);
  });

  test('send', async () => {
    const id = 'batchsnd-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).patch(`/organisations/${ORG}/batches/${id}/send`).reply(200, batchJson(id));
    const r = await batches().send({
      batchId: id,
      deliveryProducts: [createBatchDeliveryProduct('CH', DeliveryProduct.Fast)],
      printMode: PrintMode.Simplex,
      printSpectrum: PrintSpectrum.Color,
    });
    expect(r.statusCode).toBe(200);
  });

  test('cancel', async () => {
    const id = 'batchcnl-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).patch(`/organisations/${ORG}/batches/${id}/cancel`).reply(202);
    expect((await batches().cancel(id)).statusCode).toBe(202);
  });

  test('delete', async () => {
    const id = 'batchdel-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API).delete(`/organisations/${ORG}/batches/${id}`).reply(204);
    expect((await batches().delete(id)).statusCode).toBe(204);
  });

  test('delete_unauthorized', async () => {
    const id = 'batchdel-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .delete(`/organisations/${ORG}/batches/${id}`)
      .reply(401, { errors: { code: 'access_denied' } });
    await expect(batches().delete(id)).rejects.toThrow(PingenError);
  });

  describe('edit', () => {
    const id = 'batchedt-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

    test('sends name and icon as JSON:API attributes', async () => {
      let bodySent: unknown;
      nock(API)
        .patch(`/organisations/${ORG}/batches/${id}`, (body) => {
          bodySent = body;
          return true;
        })
        .reply(200, batchJson(id));
      const r = await batches().edit(id, { name: 'September invoices', icon: BatchIcon.Receipt });
      expect(r.statusCode).toBe(200);
      const sent = bodySent as { data: { id: string; type: string; attributes: Record<string, unknown> } };
      expect(sent.data.id).toBe(id);
      expect(sent.data.type).toBe('batches');
      expect(sent.data.attributes).toEqual({ name: 'September invoices', icon: 'receipt' });
    });

    test('omits undefined attributes (partial patch)', async () => {
      let bodySent: unknown;
      nock(API)
        .patch(`/organisations/${ORG}/batches/${id}`, (body) => {
          bodySent = body;
          return true;
        })
        .reply(200, batchJson(id));
      await batches().edit(id, { name: 'Just renamed' });
      const sent = bodySent as { data: { attributes: Record<string, unknown> } };
      expect(sent.data.attributes).toEqual({ name: 'Just renamed' });
      expect(sent.data.attributes).not.toHaveProperty('icon');
    });

    test('throws ValidationError when name is shorter than 5 characters', () => {
      const err = (() => {
        try {
          batches().edit(id, { name: 'a' });
          return null;
        } catch (e) {
          return e;
        }
      })();
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe('name');
    });

    test('throws ValidationError when name is longer than 100 characters', () => {
      expect(() => batches().edit(id, { name: 'x'.repeat(101) })).toThrow(ValidationError);
    });

    test('accepts boundary lengths (5 and 100 characters)', async () => {
      nock(API).patch(`/organisations/${ORG}/batches/${id}`).times(2).reply(200, batchJson(id));
      await expect(batches().edit(id, { name: 'x'.repeat(5) })).resolves.toBeDefined();
      await expect(batches().edit(id, { name: 'x'.repeat(100) })).resolves.toBeDefined();
    });
  });

  test('get_statistics', async () => {
    const id = 'batchsta-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    nock(API)
      .get(`/organisations/${ORG}/batches/${id}/statistics`)
      .reply(200, {
        data: { id, type: 'batch_statistics', attributes: { letter_validating: 0 } },
      });
    expect(
      (await batches().getStatistics(id)).toResource<{ letter_validating: number }>().attributes.letter_validating,
    ).toBe(0);
  });
});

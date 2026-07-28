/**
 * Integration tests for the Pingen JS SDK against the staging environment.
 *
 * These tests make real HTTP calls and require valid staging credentials (see `.env.example`).
 * They are excluded from the normal unit-test run and must be triggered explicitly:
 *
 *     npm run test:integration
 *
 * The suite walks every resource end to end: organisations, letters (happy / cancel / delete),
 * batches (happy / delete), webhooks, emails, e-bills and the user endpoints. Cancel / send /
 * delete / update steps rely on the `simulate_cancellable` document plus the status polling in
 * `support.ts` to reach the required state, and then assert strictly — nothing is skipped.
 *
 * Tests inside a `describe` run top-to-bottom and share created resource IDs through
 * module-scoped variables.
 */

import {
  AddressPosition,
  BatchIcon,
  ChannelType,
  DeliveryProduct,
  GroupingType,
  PaperType,
  PingenClient,
  PrintMode,
  PrintSpectrum,
  SplitType,
  WebhookEventCategory,
  type BatchAttributes,
  type EbillAttributes,
  type EmailAttributes,
  type LetterAttributes,
  type OrganisationAttributes,
  type UserAttributes,
  type WebhookAttributes,
} from '../../src';
import {
  FILE_NAME_CANCELLABLE,
  attemptStateChange,
  buildEbillMetaData,
  buildEmailMetaData,
  createClient,
  documentName,
  documentPath,
  loadCredentials,
  missingCredentials,
  resolveOrganisationId,
  sleep,
  waitForStatus,
} from './support';

const credentials = loadCredentials();
const describeIntegration = describe.skipIf(missingCredentials(credentials));

const DOCUMENT = documentPath();
const CANCELLABLE_DOCUMENT = documentPath(FILE_NAME_CANCELLABLE);

let client: PingenClient;
let orgId: string;

/** Upload the document and create an e-bill with a unique invoice number. */
function createEbill(filePath: string, autoSend = false) {
  return client.ebills(orgId).uploadAndCreate({
    filePath,
    fileOriginalName: documentName(filePath),
    autoSend,
    metaData: buildEbillMetaData(),
  });
}

/** Current status of an e-bill / email, used to wait out the `validating` phase. */
const ebillStatus = async (ebillId: string) =>
  (await client.ebills(orgId).getDetails(ebillId)).toResource<EbillAttributes>().attributes.status;

const emailStatus = async (emailId: string) =>
  (await client.emails(orgId).getDetails(emailId)).toResource<EmailAttributes>().attributes.status;

describeIntegration('Pingen API (staging)', () => {
  beforeAll(async () => {
    client = await createClient(credentials);
    orgId = await resolveOrganisationId(client, credentials);
    console.log(`Using organisation ID: ${orgId}`);
  });

  // ===========================================================================
  // Organisations
  // ===========================================================================

  describe('Organisations', () => {
    test('lists organisations', async () => {
      const response = await client.organisations().getCollection();

      expect(response.statusCode).toBe(200);
      const items = response.toCollection<OrganisationAttributes>().data;
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.every((item) => item.id)).toBe(true);
    });

    test('lists organisations paginated', async () => {
      const response = await client.organisations().getCollection({ page: { number: 1, limit: 5 } });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('gets an organisation by id', async () => {
      const response = await client.organisations().getDetails(orgId);
      const organisation = response.toResource<OrganisationAttributes>();

      expect(response.statusCode).toBe(200);
      expect(organisation.id).toBe(orgId);
      if (credentials.PINGEN2_ORGANIZATION_NAME) {
        expect(organisation.attributes.name).toBe(credentials.PINGEN2_ORGANIZATION_NAME);
      }
    });
  });

  // ===========================================================================
  // Letters
  // ===========================================================================

  describe('Letters — happy case', () => {
    let letterId: string;

    test('lists letters', async () => {
      const response = await client.letters(orgId).getCollection();

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('lists letters paginated', async () => {
      const response = await client.letters(orgId).getCollection({ page: { number: 1, limit: 3 } });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('creates a letter and finds it in the collection', async () => {
      const response = await client.letters(orgId).uploadAndCreate({
        filePath: DOCUMENT,
        fileOriginalName: documentName(DOCUMENT),
        addressPosition: AddressPosition.Left,
        autoSend: true,
        deliveryProduct: DeliveryProduct.Cheap,
        printMode: PrintMode.Simplex,
        printSpectrum: PrintSpectrum.Grayscale,
      });
      const letter = response.toResource<LetterAttributes>();

      expect(letter.id).toBeTruthy();
      expect(letter.attributes.status).toBe('validating');
      letterId = letter.id;

      const detail = (await client.letters(orgId).getDetails(letterId)).toResource<LetterAttributes>();
      expect(detail.id).toBe(letterId);

      console.log('sleep 30 seconds so the collection contains the newly created letter');
      await sleep(30_000);

      // Newest first, so the letter we just created must be on the first page.
      const collection = (
        await client.letters(orgId).getCollection({ sort: '-created_at', page: { number: 1, limit: 20 } })
      ).toCollection<LetterAttributes>();
      expect(collection.data.map((item) => item.id)).toContain(letterId);
    });

    test('gets the letter by id', async () => {
      expect(letterId, 'Requires the create test to have run').toBeTruthy();

      const letter = (await client.letters(orgId).getDetails(letterId)).toResource<LetterAttributes>();

      expect(letter.id).toBe(letterId);
      console.log(`Letter status: ${letter.attributes.status}`);
    });

    test('gets the letter events', async () => {
      expect(letterId, 'Requires the create test to have run').toBeTruthy();

      const response = await client.letterEvents(orgId).getCollection(letterId);

      expect(response.statusCode).toBe(200);
      console.log(`Letter events: ${response.toCollection().data.length}`);
    });

    test('downloads the letter file', async () => {
      expect(letterId, 'Requires the create test to have run').toBeTruthy();

      const file = await client.letters(orgId).getFile(letterId);

      expect(file.length).toBeGreaterThan(0);
    });

    test('calculates the letter price', async () => {
      const response = await client.letters(orgId).calculatePrice({
        country: 'CH',
        paperTypes: [PaperType.Normal, PaperType.Normal],
        printMode: PrintMode.Simplex,
        printSpectrum: PrintSpectrum.Grayscale,
        deliveryProduct: DeliveryProduct.Cheap,
      });
      const price = response.toResource<{ currency?: string; price?: number }>();

      expect(price.id).toBeTruthy();
      console.log(`Price calculator: currency=${price.attributes.currency}, price=${price.attributes.price}`);
    });

    test.each([
      ['sent', (): Promise<unknown> => client.letterEvents(orgId).getSentCollection()],
      ['delivered', (): Promise<unknown> => client.letterEvents(orgId).getDeliveredCollection()],
      ['issues', (): Promise<unknown> => client.letterEvents(orgId).getIssueCollection()],
      ['undeliverable', (): Promise<unknown> => client.letterEvents(orgId).getUndeliverableCollection()],
    ])('reads the %s events feed', async (_feed, request) => {
      const response = (await request()) as { statusCode: number };

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Letters — cancel case', () => {
    let letterId: string;

    test('creates a cancellable letter', async () => {
      const response = await client.letters(orgId).uploadAndCreate({
        filePath: CANCELLABLE_DOCUMENT,
        fileOriginalName: documentName(CANCELLABLE_DOCUMENT),
        addressPosition: AddressPosition.Left,
        autoSend: true,
        deliveryProduct: DeliveryProduct.Cheap,
        printMode: PrintMode.Simplex,
        printSpectrum: PrintSpectrum.Grayscale,
      });
      const letter = response.toResource<LetterAttributes>();

      expect(letter.id).toBeTruthy();
      expect(letter.attributes.status).toBe('validating');
      letterId = letter.id;
    });

    test('cancels the letter', async () => {
      expect(letterId, 'Requires the create test to have run').toBeTruthy();

      console.log('sleep 10 seconds so the letter reaches a cancellable state');
      await sleep(10_000);

      const response = await attemptStateChange(() => client.letters(orgId).cancel(letterId));

      expect(response.statusCode).toBe(202);
    });
  });

  describe('Letters — delete case', () => {
    let letterId: string;

    test('creates a letter without auto-send', async () => {
      const response = await client.letters(orgId).uploadAndCreate({
        filePath: DOCUMENT,
        fileOriginalName: documentName(DOCUMENT),
        addressPosition: AddressPosition.Right,
        autoSend: false,
      });
      const letter = response.toResource<LetterAttributes>();

      expect(letter.id).toBeTruthy();
      expect(letter.attributes.status).toBe('validating');
      letterId = letter.id;

      await sleep(5_000);
    });

    test('deletes the letter', async () => {
      expect(letterId, 'Requires the create test to have run').toBeTruthy();

      expect((await client.letters(orgId).delete(letterId)).statusCode).toBe(204);
      console.log(`Deleted letter: ${letterId}`);
    });
  });

  // ===========================================================================
  // Batches
  // ===========================================================================

  describe('Batches — happy case', () => {
    let batchId: string;

    test('lists batches', async () => {
      const response = await client.batches(orgId).getCollection();

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('lists batches paginated', async () => {
      const response = await client.batches(orgId).getCollection({ page: { number: 1, limit: 3 } });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('creates a batch on the post channel', async () => {
      const response = await client.batches(orgId).uploadAndCreate({
        filePath: DOCUMENT,
        fileOriginalName: documentName(DOCUMENT),
        name: 'Integration Test Batch',
        icon: BatchIcon.Document,
        addressPosition: AddressPosition.Left,
        groupingType: GroupingType.Merge,
        splitType: SplitType.QrInvoice,
        splitSize: 2,
        channelType: ChannelType.Post,
      });
      const batch = response.toResource<BatchAttributes>();

      expect(batch.id).toBeTruthy();
      expect(batch.attributes.channel_type).toBe(ChannelType.Post);
      batchId = batch.id;
      console.log(`Created batch: ${batchId} (status: ${batch.attributes.status})`);
    });

    test('gets the batch by id including the deliverable count', async () => {
      expect(batchId, 'Requires the create test to have run').toBeTruthy();

      const batch = (await client.batches(orgId).getDetails(batchId)).toResource<BatchAttributes>();

      expect(batch.id).toBe(batchId);
      expect(batch.attributes).toHaveProperty('deliverable_count');
      console.log(`Batch status: ${batch.attributes.status}, deliverables: ${batch.attributes.deliverable_count}`);
    });

    test('updates the batch name and icon', async () => {
      expect(batchId, 'Requires the create test to have run').toBeTruthy();

      console.log('sleep 10 seconds so the batch reaches an updatable state');
      await sleep(10_000);

      const response = await client.batches(orgId).edit(batchId, {
        name: 'Updated Integration Batch',
        icon: BatchIcon.Rocket,
      });

      expect([200, 202]).toContain(response.statusCode);
      expect(response.toResource<BatchAttributes>().attributes.name).toBe('Updated Integration Batch');
    });

    test('gets the batch events', async () => {
      expect(batchId, 'Requires the create test to have run').toBeTruthy();

      const response = await client.batchEvents(orgId).getCollection(batchId);

      expect(response.statusCode).toBe(200);
      console.log(`Batch events: ${response.toCollection().data.length}`);
    });

    test('gets the batch statistics', async () => {
      expect(batchId, 'Requires the create test to have run').toBeTruthy();

      expect((await client.batches(orgId).getStatistics(batchId)).statusCode).toBe(200);
    });
  });

  describe('Batches — delete case', () => {
    let batchId: string;

    test('creates a batch', async () => {
      const response = await client.batches(orgId).uploadAndCreate({
        filePath: CANCELLABLE_DOCUMENT,
        fileOriginalName: documentName(CANCELLABLE_DOCUMENT),
        name: 'Integration Test Batch',
        icon: BatchIcon.Document,
        addressPosition: AddressPosition.Left,
        groupingType: GroupingType.Merge,
        splitType: SplitType.QrInvoice,
        splitSize: 2,
      });
      const batch = response.toResource<BatchAttributes>();

      expect(batch.id).toBeTruthy();
      batchId = batch.id;
      console.log(`Created batch: ${batchId}`);
    });

    test('deletes the batch together with its deliverables', async () => {
      expect(batchId, 'Requires the create test to have run').toBeTruthy();

      console.log('sleep 10 seconds so the batch reaches a deletable state');
      await sleep(10_000);

      const response = await client.batches(orgId).delete(batchId, { withDeliverables: true });

      expect(response.statusCode).toBe(204);
      console.log(`Deleted batch: ${batchId}`);
    });
  });

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  describe('Webhooks', () => {
    let webhookId: string;

    test('lists webhooks', async () => {
      const response = await client.webhooks(orgId).getCollection();

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('creates a webhook', async () => {
      const response = await client.webhooks(orgId).create({
        eventCategory: WebhookEventCategory.Issues,
        url: 'https://httpbin.org/post',
        signingKey: 'integration-test-signing-key-32c',
      });
      const webhook = response.toResource<WebhookAttributes>();

      expect(webhook.id).toBeTruthy();
      webhookId = webhook.id;
      console.log(`Created webhook: ${webhookId} (url: ${webhook.attributes.url})`);
    });

    test('gets the webhook by id', async () => {
      expect(webhookId, 'Requires the create test to have run').toBeTruthy();

      const webhook = (await client.webhooks(orgId).getDetails(webhookId)).toResource<WebhookAttributes>();

      expect(webhook.id).toBe(webhookId);
      console.log(`Webhook url: ${webhook.attributes.url}`);
    });

    test('deletes the webhook', async () => {
      expect(webhookId, 'Requires the create test to have run').toBeTruthy();

      expect((await client.webhooks(orgId).delete(webhookId)).statusCode).toBe(204);
      console.log(`Deleted webhook: ${webhookId}`);
    });
  });

  // ===========================================================================
  // Emails
  // ===========================================================================

  describe('Emails — happy case', () => {
    let emailId: string;

    test('lists emails', async () => {
      const response = await client.emails(orgId).getCollection();

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('creates an email', async () => {
      const response = await client.emails(orgId).uploadAndCreate({
        filePath: DOCUMENT,
        fileOriginalName: documentName(DOCUMENT),
        autoSend: true,
        metaData: buildEmailMetaData(),
      });
      const email = response.toResource<EmailAttributes>();

      expect(email.id).toBeTruthy();
      emailId = email.id;
      console.log(`Created email: ${emailId} (status: ${email.attributes.status})`);
    });

    test('gets the email by id', async () => {
      expect(emailId, 'Requires the create test to have run').toBeTruthy();

      const email = (await client.emails(orgId).getDetails(emailId)).toResource<EmailAttributes>();

      expect(email.id).toBe(emailId);
      console.log(`Email status: ${email.attributes.status}`);
    });

    test('gets the email events', async () => {
      expect(emailId, 'Requires the create test to have run').toBeTruthy();

      const response = await client.emailEvents(orgId).getCollection(emailId);

      expect(response.statusCode).toBe(200);
      console.log(`Email events: ${response.toCollection().data.length}`);
    });

    test('downloads the email file', async () => {
      expect(emailId, 'Requires the create test to have run').toBeTruthy();

      console.log('sleep 5 seconds so the email reaches a retrievable state');
      await sleep(5_000);

      const file = await client.emails(orgId).getFile(emailId);

      expect(file.length).toBeGreaterThan(0);
    });
  });

  describe('Emails — cancel case', () => {
    let emailId: string;

    test('creates a cancellable email', async () => {
      const response = await client.emails(orgId).uploadAndCreate({
        filePath: CANCELLABLE_DOCUMENT,
        fileOriginalName: documentName(CANCELLABLE_DOCUMENT),
        autoSend: true,
        metaData: buildEmailMetaData(),
      });

      emailId = response.toResource<EmailAttributes>().id;
      expect(emailId).toBeTruthy();
    });

    test('cancels the email', async () => {
      expect(emailId, 'Requires the create test to have run').toBeTruthy();

      // Cancelling is rejected with 409 while the email is still validating.
      await waitForStatus(() => emailStatus(emailId), { label: 'Email' });

      const response = await attemptStateChange(() => client.emails(orgId).cancel(emailId));

      expect(response.statusCode).toBe(202);
    });
  });

  describe('Emails — delete case', () => {
    let emailId: string;

    test('creates an email without auto-send', async () => {
      const response = await client.emails(orgId).uploadAndCreate({
        filePath: DOCUMENT,
        fileOriginalName: documentName(DOCUMENT),
        autoSend: false,
        metaData: buildEmailMetaData(),
      });

      emailId = response.toResource<EmailAttributes>().id;
      expect(emailId).toBeTruthy();
    });

    test('deletes the email', async () => {
      expect(emailId, 'Requires the create test to have run').toBeTruthy();

      console.log('sleep 10 seconds so the email reaches a deletable state');
      await sleep(10_000);

      expect((await client.emails(orgId).delete(emailId)).statusCode).toBe(204);
      console.log(`Deleted email: ${emailId}`);
    });
  });

  // ===========================================================================
  // E-Bills
  // ===========================================================================

  describe('E-Bills — happy case', () => {
    let ebillId: string;

    test('lists e-bills', async () => {
      const response = await client.ebills(orgId).getCollection();

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.toCollection().data)).toBe(true);
    });

    test('creates an e-bill', async () => {
      const ebill = (await createEbill(DOCUMENT)).toResource<EbillAttributes>();

      expect(ebill.id).toBeTruthy();
      ebillId = ebill.id;
      console.log(`Created e-bill: ${ebillId} (status: ${ebill.attributes.status})`);
    });

    test('gets the e-bill by id', async () => {
      expect(ebillId, 'Requires the create test to have run').toBeTruthy();

      const ebill = (await client.ebills(orgId).getDetails(ebillId)).toResource<EbillAttributes>();

      expect(ebill.id).toBe(ebillId);
      console.log(`E-Bill status: ${ebill.attributes.status}`);
    });

    test('gets the e-bill events', async () => {
      expect(ebillId, 'Requires the create test to have run').toBeTruthy();

      const response = await client.ebillEvents(orgId).getCollection(ebillId);

      expect(response.statusCode).toBe(200);
      console.log(`E-Bill events: ${response.toCollection().data.length}`);
    });

    test('sends the e-bill', async () => {
      expect(ebillId, 'Requires the create test to have run').toBeTruthy();

      await waitForStatus(() => ebillStatus(ebillId), { label: 'E-Bill' });

      const response = await attemptStateChange(() => client.ebills(orgId).send(ebillId));

      expect([200, 202]).toContain(response.statusCode);
    });

    test('downloads the e-bill file', async () => {
      expect(ebillId, 'Requires the create test to have run').toBeTruthy();

      const file = await client.ebills(orgId).getFile(ebillId);

      expect(file.length).toBeGreaterThan(0);
    });
  });

  describe('E-Bills — cancel case', () => {
    let ebillId: string;

    test('creates a cancellable e-bill', async () => {
      ebillId = (await createEbill(CANCELLABLE_DOCUMENT, true)).toResource<EbillAttributes>().id;

      expect(ebillId).toBeTruthy();
    });

    test('cancels the e-bill', async () => {
      expect(ebillId, 'Requires the create test to have run').toBeTruthy();

      await waitForStatus(() => ebillStatus(ebillId), { label: 'E-Bill' });

      const response = await attemptStateChange(() => client.ebills(orgId).cancel(ebillId));

      expect(response.statusCode).toBe(202);
    });
  });

  describe('E-Bills — delete case', () => {
    let ebillId: string;

    test('creates an e-bill', async () => {
      ebillId = (await createEbill(DOCUMENT)).toResource<EbillAttributes>().id;

      expect(ebillId).toBeTruthy();
    });

    test('deletes the e-bill', async () => {
      expect(ebillId, 'Requires the create test to have run').toBeTruthy();

      console.log('sleep 10 seconds so the e-bill reaches a deletable state');
      await sleep(10_000);

      expect((await client.ebills(orgId).delete(ebillId)).statusCode).toBe(204);
      console.log(`Deleted e-bill: ${ebillId}`);
    });
  });

  // ===========================================================================
  // User
  // ===========================================================================

  describe('User', () => {
    test('gets the authenticated user', async () => {
      const user = (await client.users().getDetails()).toResource<UserAttributes>();

      expect(user.id).toBeTruthy();
      expect(user.attributes.email).toBeTruthy();
      console.log(`User: ${user.attributes.first_name} ${user.attributes.last_name} (${user.attributes.email})`);
    });

    test('gets the user associations', async () => {
      const response = await client.userAssociations().getCollection();

      expect(response.statusCode).toBe(200);
      console.log(`User associations: ${response.toCollection().data.length}`);
    });
  });
});

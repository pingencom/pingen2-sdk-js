# pingen2-sdk-js

A lightweight, fully typed Node.js SDK for the [Pingen REST API](https://api.pingen.com).

---

## Table of contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Resources](#resources)
  - [Organisations](#organisations)
  - [Letters](#letters)
  - [Batches](#batches)
  - [Events](#events)
  - [Webhooks](#webhooks)
  - [Ebills & Emails](#ebills--emails)
- [Typed responses](#typed-responses)
- [Error handling](#error-handling)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Development](#development)
- [Versioning](#versioning)
- [License](#license)

---

## Requirements

- Node.js 18+
- TypeScript 5+ (optional — full typings included)
- A Pingen account with OAuth credentials ([how to obtain](https://api.pingen.com/documentation#section/Authentication/How-to-obtain-a-Client-ID))

---

## Installation

```sh
npm install pingen2-sdk-js
```

---

## Quick start

Upload a PDF and send it as a physical letter in one call:

```typescript
import {
  PingenClient,
  AddressPosition,
  DeliveryProduct,
  PrintMode,
  PrintSpectrum,
  type LetterAttributes,
} from 'pingen2-sdk-js';

const { PINGEN_CLIENT_ID, PINGEN_CLIENT_SECRET, PINGEN_ORG_ID } = process.env;
if (!PINGEN_CLIENT_ID || !PINGEN_CLIENT_SECRET || !PINGEN_ORG_ID) {
  throw new Error('Missing PINGEN_CLIENT_ID / PINGEN_CLIENT_SECRET / PINGEN_ORG_ID');
}

const client = new PingenClient(PINGEN_CLIENT_ID, PINGEN_CLIENT_SECRET);

const res = await client.letters(PINGEN_ORG_ID).uploadAndCreate({
  filePath: './invoice.pdf',
  fileOriginalName: 'invoice.pdf',
  addressPosition: AddressPosition.Left,
  autoSend: true,
  deliveryProduct: DeliveryProduct.Fast,
  printMode: PrintMode.Simplex,
  printSpectrum: PrintSpectrum.Color,
});

const letter = res.toResource<LetterAttributes>();
console.log(`letter ${letter.id} → status ${letter.attributes.status}`);
```

That single `uploadAndCreate` call does three things: requests a signed upload URL from Pingen, PUTs the PDF to it, and creates the letter resource with `auto_send=true` so Pingen prints and dispatches it immediately. Drop `autoSend: true` (and the three print/delivery fields) if you want to inspect the letter before sending — then call `letters.send({ letterId, … })` later.

The client handles OAuth lazily: the first request fetches a token, subsequent requests reuse it from cache, and a 401 triggers an automatic refresh.

---

## Authentication

`PingenClient` accepts credentials in two equivalent forms — pick whichever reads cleaner at the call site.

### Positional (simple case)

```typescript
new PingenClient('CLIENT_ID', 'CLIENT_SECRET'); // production
new PingenClient('CLIENT_ID', 'CLIENT_SECRET', true); // staging
```

### Config object (full control)

```typescript
new PingenClient({
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  useStaging: true,
  maxAttempts: 5,
  timeoutMs: 30_000,
  uploadTimeoutMs: 120_000,
});
```

Optional: pre-fetch a token before the first request (e.g. before a long-running batch flow):

```typescript
await client.ensureToken();
```

---

## Resources

### Organisations

```typescript
import { OrganisationAttributes } from 'pingen2-sdk-js';

const orgs = (await client.organisations().getCollection()).toCollection<OrganisationAttributes>();
const org = (await client.organisations().getDetails(orgId)).toResource<OrganisationAttributes>();
```

### Letters

```typescript
import {
  AddressPosition,
  DeliveryProduct,
  PrintMode,
  PrintSpectrum,
  PaperType,
  LetterAttributes,
} from 'pingen2-sdk-js';

const letters = client.letters(orgId);

// Upload + create (no auto-send)
const res = await letters.uploadAndCreate({
  filePath: './invoice.pdf',
  fileOriginalName: 'invoice.pdf',
  addressPosition: AddressPosition.Left,
  autoSend: false,
});
const letter = res.toResource<LetterAttributes>();

// Upload + create + auto-send
await letters.uploadAndCreate({
  filePath: './invoice.pdf',
  fileOriginalName: 'invoice.pdf',
  addressPosition: AddressPosition.Left,
  autoSend: true,
  deliveryProduct: DeliveryProduct.Fast,
  printMode: PrintMode.Simplex,
  printSpectrum: PrintSpectrum.Color,
});

// Send an existing letter
await letters.send({
  letterId,
  deliveryProduct: DeliveryProduct.Fast,
  printMode: PrintMode.Simplex,
  printSpectrum: PrintSpectrum.Color,
});

// Cancel / delete / edit / download
await letters.cancel(letterId);
await letters.delete(letterId);
await letters.edit(letterId, [PaperType.Normal, PaperType.Qr]);
const pdf = await letters.getFile(letterId);

// Calculate price
const price = (
  await letters.calculatePrice({
    country: 'CH',
    paperTypes: [PaperType.Normal],
    printMode: PrintMode.Simplex,
    printSpectrum: PrintSpectrum.Color,
    deliveryProduct: DeliveryProduct.Fast,
  })
).toResource<{ currency: string; price: number }>();
```

### Batches

```typescript
import {
  AddressPosition,
  BatchIcon,
  GroupingType,
  SplitType,
  PrintMode,
  PrintSpectrum,
  DeliveryProduct,
  BatchAttributes,
  createBatchDeliveryProduct,
} from 'pingen2-sdk-js';

const batches = client.batches(orgId);

const res = await batches.uploadAndCreate({
  filePath: './letters.pdf',
  fileOriginalName: 'letters.pdf',
  name: 'August invoices',
  icon: BatchIcon.Campaign,
  addressPosition: AddressPosition.Left,
  groupingType: GroupingType.Merge,
  splitType: SplitType.Page,
});

await batches.send({
  batchId,
  deliveryProducts: [
    createBatchDeliveryProduct('CH', DeliveryProduct.Fast),
    createBatchDeliveryProduct('DE', DeliveryProduct.Cheap),
  ],
  printMode: PrintMode.Duplex,
  printSpectrum: PrintSpectrum.Color,
});
```

### Events

```typescript
import { EventAttributes } from 'pingen2-sdk-js';

const events = (await client.letterEvents(orgId).getCollection(letterId)).toCollection<EventAttributes>();

await client.letterEvents(orgId).getIssueCollection();
await client.letterEvents(orgId).getDeliveredCollection();
await client.batchEvents(orgId).getCollection(batchId);
```

### Webhooks

```typescript
import { WebhookEventCategory, WebhookAttributes, constructWebhookEvent } from 'pingen2-sdk-js';

const webhooks = client.webhooks(orgId);

const wh = (
  await webhooks.create({
    eventCategory: WebhookEventCategory.Delivered,
    url: 'https://myapp.com/webhook',
    signingKey: 'my-signing-key',
  })
).toResource<WebhookAttributes>();

await webhooks.delete(wh.id);

// Verify incoming webhook signature (constant-time comparison)
const event = constructWebhookEvent(rawBody, signatureHeader, 'my-signing-key');
```

### Ebills & Emails

```typescript
import { EbillAttributes, EmailAttributes, PresetRelationship } from 'pingen2-sdk-js';

const ebill = (
  await client.ebills(orgId).uploadAndCreate({
    filePath: './invoice.pdf',
    fileOriginalName: 'invoice.pdf',
    autoSend: true,
    metaData: {
      invoice_number: 'INV-001',
      invoice_date: '2025-01-01',
      invoice_due_date: '2025-02-01',
      recipient_identifier: '411000100',
    },
    preset: new PresetRelationship('preset-uuid'),
  })
).toResource<EbillAttributes>();

const email = (
  await client.emails(orgId).uploadAndCreate({
    filePath: './invoice.pdf',
    fileOriginalName: 'invoice.pdf',
    autoSend: true,
    metaData: {
      sender_name: 'ACME GmbH',
      recipient_email: 'billing@client.com',
      recipient_name: 'Client AG',
      reply_email: 'billing@acme.com',
      reply_name: 'ACME Billing',
      subject: 'Invoice #123',
      content: 'Please find your invoice attached.',
    },
  })
).toResource<EmailAttributes>();
```

---

## Typed responses

Every API call returns a `PingenResponse`. Cast it with `.toResource<T>()` or `.toCollection<T>()` for type-safe access:

```typescript
const res = (await client.letters(orgId).getDetails(letterId)).toResource<LetterAttributes>();

res.id; // string
res.resourceType; // 'letters'
res.attributes.status; // typed
res.relationships; // JSON:API relationships
res.included; // included resources
res.statusCode; // HTTP status
res.headers; // response headers

const col = (await client.letters(orgId).getCollection({ 'page[number]': '2' })).toCollection<LetterAttributes>();
col.meta?.total;
col.meta?.current_page;
col.links?.next;
```

---

## Error handling

Every SDK failure extends `PingenError`. HTTP responses dispatch to a per-status subclass so callers can match the cases they care about; everything else (local validation, missing credentials, webhook signature mismatch) shares the same base.

```typescript
import {
  PingenError,
  PingenNotFoundError,
  PingenRateLimitError,
  PingenUnprocessableEntityError,
  ValidationError,
  AuthenticationError,
} from 'pingen2-sdk-js';

try {
  await client.letters(orgId).delete(letterId);
} catch (e) {
  if (e instanceof ValidationError) {
    console.log('Local check failed:', e.field, e.message);
  } else if (e instanceof PingenNotFoundError) {
    console.log('Letter no longer exists');
  } else if (e instanceof PingenRateLimitError) {
    await sleep(e.retryAfterMs ?? 1000);
  } else if (e instanceof PingenUnprocessableEntityError) {
    console.log('API rejected payload:', e.body);
  } else if (e instanceof PingenError) {
    console.log(e.status, e.body, e.requestId);
  }
}
```

Every error carries `.status`, `.body`, `.requestId`, and (for `429`/`503`) `.retryAfterMs`. Status-specific subclasses available: `PingenBadRequestError` (400), `PingenUnauthorizedError` (401), `PingenForbiddenError` (403), `PingenNotFoundError` (404), `PingenMethodNotAllowedError` (405), `PingenNotAcceptableError` (406), `PingenConflictError` (409), `PingenGoneError` (410), `PingenUnsupportedMediaError` (415), `PingenUnprocessableEntityError` (422), `PingenDependencyError` (424), `PingenRateLimitError` (429), `PingenServerError` (500), `PingenServiceUnavailableError` (503), `PingenTimeoutError`.

The SDK retries `429` and `5xx` automatically (with jittered exponential backoff and a reused `Idempotency-Key` for mutations). The retry budget defaults to 3 attempts and is configurable via `maxAttempts`.

---

## Configuration

```typescript
const client = new PingenClient({
  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  useStaging: false, // default false
  maxAttempts: 3, // retry budget for 429/5xx
  timeoutMs: 20_000, // per-request timeout
  uploadTimeoutMs: 60_000, // PUT to signed URL
});
```

The SDK identifies itself with a `User-Agent: PINGEN.SDK.NODE` header on every request.

---

## Scripts

```sh
npm test              # run tests with coverage
npm run build         # clean + compile TypeScript
npm run lint          # ESLint
npm run format        # Prettier (auto-fix)
npm run format:check  # Prettier (check only)
npm run clean         # remove dist/
```

---

## Development

The project is developed exclusively inside Docker — there is no supported local-Node workflow. All scripts (`npm test`, `npm run lint`, `npm run build`, `npm run manual-test`) are run through `docker compose exec`.

```sh
docker compose build
docker compose up -d
docker compose exec nodejs-sdk npm ci
docker compose exec nodejs-sdk npm test
docker compose down
```

---

## Versioning

Follows [semver](https://semver.org/). The published version is derived automatically from the latest git tag — tag a release (`git tag v1.2.3 && git push --tags`) and `npm publish` will set `package.json` accordingly via `prepublishOnly`.

---

## License

BSD 3-Clause — see [LICENSE](LICENSE)

Copyright (c) 2026, Pingen GmbH.

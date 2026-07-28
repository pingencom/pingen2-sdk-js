# pingen2-sdk-js

A lightweight, fully typed JS SDK for the [Pingen REST API](https://api.pingen.com).

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

- Node.js 22+ (matches the CI matrix: 22 / 24 / 26)
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
  ChannelType,
  GroupingType,
  SplitType,
  PrintMode,
  PrintSpectrum,
  DeliveryProduct,
  BatchAttributes,
  BatchStatisticsAttributes,
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
  channelType: ChannelType.Post, // post (default) | ebill | email — always sent
});

// Edit (name is validated locally: 5–100 characters)
await batches.edit(batchId, { name: 'September invoices', icon: BatchIcon.Rocket });

// Statistics
const stats = (await batches.getStatistics(batchId)).toResource<BatchStatisticsAttributes>();

// Delete. `withDeliverables` also drives the deprecated (but still mandatory) `with_letters`
// flag — pass `true` to remove the contained letters / e-bills / emails as well.
await batches.delete(batchId, { withDeliverables: true });
```

#### Sending a batch

The payload depends on the batch channel — the SDK picks the matching JSON:API type
(`batches_channel_post_send` / `_email_send` / `_ebill_send`) and, for the electronic channels,
the single delivery product the API accepts:

```typescript
// post (default) — print settings required
await batches.send({
  batchId,
  deliveryProduct: DeliveryProduct.Fast,
  printMode: PrintMode.Duplex,
  printSpectrum: PrintSpectrum.Color,
});

// email → delivery_product: electronic_email
await batches.send({ batchId, channelType: ChannelType.Email });

// ebill → delivery_product: electronic_ebill
await batches.send({ batchId, channelType: ChannelType.Ebill });
```

Batch details expose `deliverable_count`; the older `letter_count` is deprecated but still
returned by the API.

### Events

```typescript
import { EventAttributes } from 'pingen2-sdk-js';

const events = (await client.letterEvents(orgId).getCollection(letterId)).toCollection<EventAttributes>();

await client.letterEvents(orgId).getIssueCollection();
await client.letterEvents(orgId).getDeliveredCollection();
await client.batchEvents(orgId).getCollection(batchId);

// Deliverable events for the electronic channels (type `deliverables_events`)
await client.ebillEvents(orgId).getCollection(ebillId);
await client.emailEvents(orgId).getCollection(emailId);
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

Both channels support `cancel`, `delete` and `getFile`; e-bills created with `autoSend: false`
are submitted later with `send`:

```typescript
await client.ebills(orgId).send(ebillId);

await client.ebills(orgId).cancel(ebillId);
await client.ebills(orgId).delete(ebillId);
const ebillPdf = await client.ebills(orgId).getFile(ebillId);

await client.emails(orgId).cancel(emailId);
await client.emails(orgId).delete(emailId);
const emailPdf = await client.emails(orgId).getFile(emailId);
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

const col = (await client.letters(orgId).getCollection({ page: { number: 2 } })).toCollection<LetterAttributes>();
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

The SDK identifies itself with a `User-Agent: PINGEN.SDK.JS` header on every request.

---

## Scripts

```sh
npm test                 # unit tests with coverage
npm run test:integration # integration tests against the staging API (credentials required)
npm run build            # clean + compile TypeScript
npm run lint             # ESLint
npm run format           # Prettier (auto-fix)
npm run format:check     # Prettier (check only)
npm run clean            # remove dist/
```

### Integration tests

`tests/integration` exercises every resource against the real Pingen **staging** API:
organisations, letters (happy / cancel / delete), batches (happy / delete), webhooks, emails,
e-bills and the user endpoints, plus the OAuth token lifecycle.

```sh
cp .env.example .env    # fill in PINGEN2_CLIENT_ID / PINGEN2_CLIENT_SECRET
npm run test:integration

# or inside Docker — the repo (including .env) is mounted into the container
docker compose exec js-sdk npm run test:integration
```

Both suites are Vitest projects declared in `vitest.workspace.ts` and share the settings in
`vitest.config.ts`: `unit` is the mocked suite that gates coverage, `integration` adds the long
timeouts and sequential execution the staging calls need. Run one project, or both at once:

```sh
npx vitest run --project integration
npx vitest run                        # unit + integration, each labelled in the output
```

The suite is skipped when no credentials are configured, so it never breaks a plain `npm test`
run (it is excluded from it) or CI. Environment variables take precedence over `.env`. It runs
against staging by default and creates real (test-only) deliveries there, including the
`tests/fixtures/test_simulate_cancellable.pdf` document, which staging keeps in a cancellable
state so the cancel / delete flows can be asserted strictly.

---

## Development

The project is developed exclusively inside Docker — there is no supported local-Node workflow. All scripts (`npm test`, `npm run lint`, `npm run build`, `npm run manual-test`) are run through `docker compose exec`.

```sh
docker compose build
docker compose up -d
docker compose exec js-sdk npm test
docker compose exec js-sdk npm run test:integration   # needs .env (see below)
docker compose down
```

Dependencies are installed while the image is built, and compose seeds its `node_modules` volume
from that layer — no manual `npm ci` step. Docker never re-seeds a volume that already exists, so
after changing `package.json` / `package-lock.json` (or when coming from an older image) rebuild
and renew the volume:

```sh
docker compose build
docker compose up -d --force-recreate --renew-anon-volumes
```

The container runs Node 24 (matching the release workflow). Override per build if you need to
reproduce another entry of the CI matrix:

```sh
NODE_VERSION=26 docker compose build
```

---

## Versioning

Follows [semver](https://semver.org/). The published version is derived automatically from the latest git tag — tag a release (`git tag v1.2.3 && git push --tags`) and `npm publish` will set `package.json` accordingly via `prepublishOnly`.

---

## License

BSD 3-Clause — see [LICENSE](LICENSE)

Copyright (c) 2026, Pingen GmbH.

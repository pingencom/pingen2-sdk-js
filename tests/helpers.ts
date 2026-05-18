import nock from 'nock';
import path from 'path';
import { ApiRequestor } from '../src/requestor';

export const API = 'https://api.pingen.com';
export const STAGING = 'https://api-staging.pingen.com';
export const ORG = 'testxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxx1';
export const TOKEN = 'test_access_token';
export const FIXTURE_PDF = path.join(__dirname, 'fixtures', 'lorem.pdf');

// Build a fresh ApiRequestor wired to either prod or staging — keeps all resource tests in
// one factory instead of duplicating `new ApiRequestor(TOKEN, ...)` in every file.
export const requestor = (useStaging = false): ApiRequestor => new ApiRequestor(TOKEN, { useStaging });

export function letterJson(id: string) {
  return {
    data: {
      id,
      type: 'letters',
      attributes: {
        status: 'validating',
        file_original_name: 'lorem.pdf',
        file_pages: 2,
        address: 'Hans Meier\nExample street 4\n8000 Zürich\nSwitzerland',
        address_position: 'left',
        country: 'CH',
        delivery_product: 'fast',
        print_mode: 'simplex',
        print_spectrum: 'color',
        price_currency: 'CHF',
        price_value: 1.25,
        paper_types: ['normal', 'qr'],
        fonts: [
          { name: 'Helvetica', is_embedded: true },
          { name: 'Helvetica-Bold', is_embedded: false },
        ],
        source: 'api',
        tracking_number: '98.1234.11',
        submitted_at: '2021-11-19T09:42:48+0100',
        created_at: '2020-11-19T09:42:48+0100',
        updated_at: '2020-11-19T09:42:48+0100',
      },
      relationships: {
        organisation: { links: { related: 'string' }, data: { id: ORG, type: 'organisations' } },
        events: { links: { related: { href: 'string', meta: { count: 0 } } } },
        batch: { links: { related: 'string' }, data: { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'batches' } },
      },
      links: { self: 'string' },
      meta: { abilities: { self: { cancel: 'ok', delete: 'ok', submit: 'ok', edit: 'ok' } } },
    },
    included: [{}],
  };
}

export function batchJson(id: string) {
  return {
    data: {
      id,
      type: 'batches',
      attributes: {
        name: 'Monthly Invoicing August 2022',
        icon: 'campaign',
        status: 'validating',
        file_original_name: 'lorem.pdf',
        letter_count: 2,
        address_position: 'left',
        print_mode: 'simplex',
        print_spectrum: 'color',
        price_currency: 'CHF',
        price_value: 1.25,
        source: 'api',
        submitted_at: '2021-11-19T09:42:48+0100',
        created_at: '2020-11-19T09:42:48+0100',
        updated_at: '2020-11-19T09:42:48+0100',
      },
      relationships: {
        organisation: { links: { related: 'string' }, data: { id: ORG, type: 'organisations' } },
        events: { links: { related: { href: 'string', meta: { count: 0 } } } },
      },
      links: { self: 'string' },
      meta: { abilities: { self: { cancel: 'ok', delete: 'ok', submit: 'ok', edit: 'ok' } } },
    },
    included: [{}],
  };
}

export function organisationJson(id: string) {
  return {
    data: {
      id,
      type: 'organisations',
      attributes: {
        name: 'ACME GmbH',
        status: 'active',
        plan: 'free',
        billing_mode: 'prepaid',
        billing_currency: 'CHF',
        billing_balance: 11.23,
        missing_credits: 0,
        edition: 'string',
        default_country: 'CH',
        default_address_position: 'left',
        data_retention_addresses: 18,
        data_retention_pdf: 12,
        limits_monthly_letters_count: 5000,
        color: '#0758FF',
        flags: ['string'],
        created_at: '2020-11-19T09:42:48+0100',
        updated_at: '2020-11-19T09:42:48+0100',
      },
      relationships: {
        associations: { links: { related: { href: 'string', meta: { count: 0 } } } },
      },
      links: { self: 'string' },
      meta: { abilities: { self: { manage: 'ok' } } },
    },
    included: [{}],
  };
}

export function ebillJson(id: string) {
  return {
    data: {
      id,
      type: 'ebills',
      attributes: {
        status: 'validating',
        file_original_name: 'lorem.pdf',
        file_pages: 2,
        recipient_identifier: '41100010014282213',
        invoice_number: 'Invoice 8051',
        invoice_date: '2025-10-01',
        invoice_due_date: '2025-10-30',
        invoice_value: 1250.3,
        invoice_currency: 'CHF',
        price_currency: 'CHF',
        price_value: 1.25,
        source: 'api',
        submitted_at: '2021-11-19T09:42:48+0100',
        created_at: '2020-11-19T09:42:48+0100',
        updated_at: '2020-11-19T09:42:48+0100',
      },
      relationships: {
        organisation: { links: { related: 'string' }, data: { id: ORG, type: 'organisations' } },
        events: { links: { related: { href: 'string', meta: { count: 0 } } } },
      },
      links: { self: 'string' },
      meta: { abilities: { self: { delete: 'ok', cancel: 'ok' } } },
    },
    included: [{}],
  };
}

export function emailJson(id: string) {
  return {
    data: {
      id,
      type: 'emails',
      attributes: {
        status: 'validating',
        file_original_name: 'lorem.pdf',
        file_pages: 2,
        recipient_identifier: 'info@acme.com',
        price_currency: 'CHF',
        price_value: 1.25,
        source: 'api',
        submitted_at: '2021-11-19T09:42:48+0100',
        created_at: '2020-11-19T09:42:48+0100',
        updated_at: '2020-11-19T09:42:48+0100',
      },
      relationships: {
        organisation: { links: { related: 'string' }, data: { id: ORG, type: 'organisations' } },
        events: { links: { related: { href: 'string', meta: { count: 0 } } } },
      },
      links: { self: 'string' },
      meta: { abilities: { self: { delete: 'ok', cancel: 'ok' } } },
    },
    included: [{}],
  };
}

export function webhookJson(id: string) {
  return {
    data: {
      id,
      type: 'webhooks',
      attributes: {
        event_category: 'issues',
        url: 'https://valid-url',
        signing_key: 'd09a',
        created_at: '2020-11-19T09:42:48+0100',
        updated_at: '2020-11-19T09:42:48+0100',
      },
    },
  };
}

export function eventJson(id: string) {
  return {
    id,
    type: 'letter_events',
    attributes: {
      code: 'A01',
      name: 'Submitted',
      description: 'Letter submitted for processing',
      producer: 'pingen',
      location: 'Zurich',
      has_image: false,
      data: [],
      emitted_at: '2021-11-19T09:42:48+0100',
      created_at: '2020-11-19T09:42:48+0100',
      updated_at: '2020-11-19T09:42:48+0100',
    },
    relationships: {
      letter: { links: { related: 'string' }, data: { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'letters' } },
    },
  };
}

export function stubFileUpload(scope: nock.Scope) {
  scope.get('/file-upload').reply(
    200,
    {
      data: {
        id: 'xx',
        type: 'file_uploads',
        attributes: { url: `${API}/s3-bucket`, url_signature: '$2y$sig', expires_at: '2099-01-01' },
      },
    },
    { 'Content-Type': 'application/vnd.api+json' },
  );
  nock(API).put('/s3-bucket').reply(201);
}

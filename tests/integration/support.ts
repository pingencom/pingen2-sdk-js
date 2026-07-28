/**
 * Shared helpers, constants and credential loading for the integration test suite.
 *
 * The integration tests hit the real Pingen **staging** API and therefore need valid staging
 * credentials. Credentials are read from a `.env` file at the repository root (copy
 * `.env.example` and fill it in) or from real environment variables (handy for CI). Real
 * environment variables take precedence over values in `.env`.
 */

import fs from 'fs';
import path from 'path';
import { PingenClient, PingenError } from '../../src';

// Document names sent to the API. The staging environment recognises the magic
// `simulate_cancellable` suffix and keeps such deliveries in a state that can be cancelled,
// which lets us exercise the cancel flow deterministically.
export const FILE_NAME = 'test.pdf';
export const FILE_NAME_CANCELLABLE = 'test_simulate_cancellable.pdf';

const KEYS = [
  'PINGEN2_CLIENT_ID',
  'PINGEN2_CLIENT_SECRET',
  'PINGEN2_ORGANIZATION_ID',
  'PINGEN2_ORGANIZATION_NAME',
  'PINGEN2_USE_STAGING',
] as const;

export type CredentialKey = (typeof KEYS)[number];
export type Credentials = Record<CredentialKey, string>;

// tests/integration/support.ts -> repository root is two levels up.
function repoRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

function parseDotenv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const values: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const separator = line.indexOf('=');
    values[line.slice(0, separator).trim()] = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return values;
}

/** Integration credentials, merging `.env` and real env vars (env vars win). */
export function loadCredentials(): Credentials {
  const dotenv = parseDotenv(path.join(repoRoot(), '.env'));
  const credentials = {} as Credentials;
  for (const key of KEYS) {
    credentials[key] = process.env[key] || dotenv[key] || '';
  }
  return credentials;
}

export function missingCredentials(credentials: Credentials): boolean {
  return !(credentials.PINGEN2_CLIENT_ID && credentials.PINGEN2_CLIENT_SECRET);
}

/** Default to staging — integration tests must never run against production. */
export function useStaging(credentials: Credentials): boolean {
  const raw = (credentials.PINGEN2_USE_STAGING || 'true').trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(raw);
}

export function documentPath(fileName: string = FILE_NAME): string {
  return path.join(repoRoot(), 'tests', 'fixtures', fileName);
}

/** `file_original_name` derived from the uploaded file itself. */
export function documentName(filePath: string): string {
  return path.basename(filePath);
}

export function buildEmailMetaData() {
  return {
    sender_name: 'Pingen Test',
    recipient_email: 'grzegorz.morgas@pingen.com',
    recipient_name: 'Test Recipient',
    reply_email: 'noreply@example.com',
    reply_name: 'Reply Test',
    subject: 'Integration Test Email',
    content: 'Dear Recipient\n\nThis is an integration test.\n\nBest regards',
  };
}

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/** Unique per call so repeated runs never clash on a duplicate invoice number. */
export function buildEbillMetaData() {
  return {
    invoice_number: `INV-${Math.random().toString(16).slice(2, 14)}`,
    invoice_date: isoDate(),
    invoice_due_date: isoDate(30),
    recipient_identifier: '41100000014283293',
  };
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** True while the API is still validating the uploaded document. */
export function isPending(status: string | undefined): boolean {
  return status === undefined || status === 'validating' || status === 'preparing';
}

/**
 * Poll a deliverable until it leaves the `validating` state — cancel / send / delete are
 * rejected with `409 conflict_state` while validation is still running.
 */
export async function waitForStatus(
  fetchStatus: () => Promise<string | undefined>,
  { attempts = 12, delayMs = 5_000, label = 'deliverable' } = {},
): Promise<string | undefined> {
  let status = await fetchStatus();
  for (let attempt = 0; attempt < attempts && isPending(status); attempt++) {
    await sleep(delayMs);
    status = await fetchStatus();
  }
  console.log(`${label} status after waiting: ${status}`);
  return status;
}

/** True when the API rejected the call because the resource is in the wrong state. */
export function isConflictState(error: unknown): boolean {
  return error instanceof PingenError && error.status === 409;
}

/**
 * Run a state-dependent action (cancel / send), retrying while the API answers
 * `409 conflict_state` — staging needs a moment before a freshly created deliverable accepts
 * them. The last error is rethrown once the attempts are used up, so the test fails loudly.
 */
export async function attemptStateChange<T>(
  action: () => Promise<T>,
  { attempts = 6, delayMs = 5_000 } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (!isConflictState(error)) {
        throw error;
      }
      lastError = error;
      console.warn(`Attempt ${attempt + 1}/${attempts} rejected:`, JSON.stringify((error as PingenError).body));
      await sleep(delayMs);
    }
  }
  throw lastError;
}

/**
 * Authenticated client for the configured environment. One per test file — the SDK caches the
 * access token internally, so every resource call reuses the same token.
 */
export async function createClient(credentials: Credentials): Promise<PingenClient> {
  const client = new PingenClient({
    clientId: credentials.PINGEN2_CLIENT_ID,
    clientSecret: credentials.PINGEN2_CLIENT_SECRET,
    useStaging: useStaging(credentials),
  });
  await client.ensureToken();
  return client;
}

/** Organisation to run against: the configured one, or the first one the account can see. */
export async function resolveOrganisationId(client: PingenClient, credentials: Credentials): Promise<string> {
  if (credentials.PINGEN2_ORGANIZATION_ID) {
    return credentials.PINGEN2_ORGANIZATION_ID;
  }
  const organisations = (await client.organisations().getCollection()).toCollection();
  const first = organisations.data[0]?.id;
  if (!first) {
    throw new Error('No organisations returned – check the staging credentials.');
  }
  return first;
}

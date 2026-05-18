import { BASE_BACKOFF_MS, MAX_RETRY_AFTER_MS } from '../constants';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const IDEMPOTENT_METHODS = new Set<HttpMethod>(['GET', 'PUT', 'DELETE']);
const MUTATION_METHODS = new Set<HttpMethod>(['POST', 'PATCH']);

// Retry policy:
//   429 — always safe (server rejected before processing); honours Retry-After.
//   5xx — safe only if method is idempotent OR we attached an Idempotency-Key (mutations).
//   Same Idempotency-Key is reused across all attempts so the server can deduplicate.
export function isRetryableStatus(method: HttpMethod, status: number): boolean {
  if (status === 429) {
    return true;
  }
  if (status >= 500 && status < 600) {
    return IDEMPOTENT_METHODS.has(method) || MUTATION_METHODS.has(method);
  }
  return false;
}

export function shouldAttachIdempotencyKey(method: HttpMethod): boolean {
  return MUTATION_METHODS.has(method);
}

// Picks the larger of server-suggested Retry-After and exponential backoff, with jitter.
// attempt starts at 0 (first retry).
export function computeBackoffMs(retryAfterHeader: string | undefined, attempt: number): number {
  const base = Math.max(parseRetryAfterMs(retryAfterHeader), BASE_BACKOFF_MS * 2 ** attempt);
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

function parseRetryAfterMs(v: string | undefined): number {
  if (typeof v !== 'string') {
    return 0;
  }
  const seconds = parseInt(v, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

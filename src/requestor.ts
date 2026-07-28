import { promises as fs } from 'fs';
import { classifyFetchError, createPingenError } from './errors';
import { PingenResponse } from './common/response';
import { ListParams, serializeListParams } from './common/list-params';
import {
  API_PRODUCTION,
  API_STAGING,
  USER_AGENT,
  DEFAULT_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS,
} from './constants';
import { newIdempotencyKey } from './utils/idempotency';
import { HttpMethod, computeBackoffMs, isRetryableStatus, shouldAttachIdempotencyKey, sleep } from './utils/retry';
import { headersToRecord } from './utils/headers';

export interface ApiRequestorOptions {
  useStaging?: boolean;
  maxAttempts?: number;
  timeoutMs?: number;
  uploadTimeoutMs?: number;
  on401?: () => Promise<string | undefined>;
}

function safeParseJson(body: string): unknown {
  if (!body) {
    return null;
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function parseRetryAfterMs(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const seconds = parseInt(value, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return seconds * 1000;
}

export class ApiRequestor {
  private accessToken: string | null;
  private readonly apiBase: string;
  private readonly maxAttempts: number;
  private readonly timeoutMs: number;
  private readonly uploadTimeoutMs: number;
  private readonly on401?: () => Promise<string | undefined>;

  constructor(accessToken: string | null, options: ApiRequestorOptions = {}) {
    this.accessToken = accessToken;
    this.apiBase = options.useStaging ? API_STAGING : API_PRODUCTION;
    this.maxAttempts = options.maxAttempts ?? MAX_RETRY_ATTEMPTS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.uploadTimeoutMs = options.uploadTimeoutMs ?? UPLOAD_TIMEOUT_MS;
    this.on401 = options.on401;
  }

  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  get(path: string, params?: ListParams, extraHeaders?: Record<string, string>): Promise<PingenResponse> {
    return this.execute('GET', this.buildUrl(path, params), undefined, extraHeaders);
  }

  post(path: string, payload: string, extraHeaders?: Record<string, string>): Promise<PingenResponse> {
    return this.execute('POST', this.apiBase + path, payload, extraHeaders);
  }

  patch(path: string, payload?: string, extraHeaders?: Record<string, string>): Promise<PingenResponse> {
    return this.execute('PATCH', this.apiBase + path, payload, extraHeaders);
  }

  // Most DELETE endpoints take no body — `payload` exists for the ones that do (batch delete
  // requires a JSON:API document carrying with_deliverables).
  delete(path: string, payload?: string): Promise<PingenResponse> {
    return this.execute('DELETE', this.apiBase + path, payload);
  }

  async put(url: string, filePath: string): Promise<void> {
    const fileBuffer = await fs.readFile(filePath);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'PUT',
        body: fileBuffer,
        signal: AbortSignal.timeout(this.uploadTimeoutMs),
      });
    } catch (e) {
      throw classifyFetchError('File upload to signed URL', e);
    }
    if (!res.ok) {
      const respBody = await res.text();
      const respHeaders = headersToRecord(res.headers);
      throw createPingenError(
        `File upload to signed URL failed (status ${res.status}).`,
        res.status,
        safeParseJson(respBody),
        respHeaders['x-request-id'],
        parseRetryAfterMs(respHeaders['retry-after']),
      );
    }
  }

  async stream(path: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(this.buildUrl(path), {
        headers: this.defaultHeaders(false),
        signal: AbortSignal.timeout(this.uploadTimeoutMs),
      });
    } catch (e) {
      throw classifyFetchError('File download', e);
    }
    const body = await res.text();
    if (!res.ok) {
      const respHeaders = headersToRecord(res.headers);
      throw createPingenError(
        `File download failed (status ${res.status}).`,
        res.status,
        safeParseJson(body),
        respHeaders['x-request-id'],
        parseRetryAfterMs(respHeaders['retry-after']),
      );
    }
    return body;
  }

  private buildUrl(path: string, params?: ListParams): string {
    const url = new URL(this.apiBase + path);
    const query = serializeListParams(params);
    if (query) {
      for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
    }
    return url.toString();
  }

  private defaultHeaders(hasBody: boolean, extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.api+json',
      ...extra,
    };
    if (hasBody) {
      headers['Content-Type'] = 'application/vnd.api+json';
    }
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private async execute(
    method: HttpMethod,
    url: string,
    body: string | undefined,
    extra?: Record<string, string>,
  ): Promise<PingenResponse> {
    const idempotencyKey = shouldAttachIdempotencyKey(method) ? newIdempotencyKey() : undefined;
    let refreshed = false;
    let attempt = 0;

    // Infinite loop pattern: every path either returns (2xx), throws (terminal/non-retryable
    // status, hit retry budget, or fetch network error), or `continue`s without incrementing
    // (one-time 401-driven token refresh, which is orthogonal to the retry budget). This way
    // there's no "unreachable" tail line to silence.
    for (;;) {
      const headers = this.defaultHeaders(body !== undefined, extra);
      if (idempotencyKey && !headers['Idempotency-Key']) {
        headers['Idempotency-Key'] = idempotencyKey;
      }
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (e) {
        throw classifyFetchError(`Pingen API ${method} ${url}`, e);
      }
      const respBody = await res.text();
      const respHeaders = headersToRecord(res.headers);
      if (res.status >= 200 && res.status < 300) {
        return new PingenResponse(respBody, res.status, respHeaders);
      }
      if (res.status === 401 && !refreshed && this.on401) {
        const fresh = await this.on401();
        refreshed = true;
        if (fresh) {
          this.accessToken = fresh;
          continue;
        }
      }
      const lastAttempt = attempt >= this.maxAttempts - 1;
      if (lastAttempt || !isRetryableStatus(method, res.status)) {
        throw createPingenError(
          `Pingen API returned ${res.status}.`,
          res.status,
          safeParseJson(respBody),
          respHeaders['x-request-id'],
          parseRetryAfterMs(respHeaders['retry-after']),
        );
      }
      await sleep(computeBackoffMs(respHeaders['retry-after'], attempt));
      attempt++;
    }
  }
}

export class PingenError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  public readonly requestId?: string;
  public readonly retryAfterMs?: number;

  constructor(message: string, status: number, body: unknown = null, requestId?: string, retryAfterMs?: number) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.body = body;
    this.requestId = requestId;
    this.retryAfterMs = retryAfterMs;
  }
}

export class PingenBadRequestError extends PingenError {} // 400
export class PingenUnauthorizedError extends PingenError {} // 401
export class PingenForbiddenError extends PingenError {} // 403
export class PingenNotFoundError extends PingenError {} // 404
export class PingenMethodNotAllowedError extends PingenError {} // 405
export class PingenNotAcceptableError extends PingenError {} // 406
export class PingenConflictError extends PingenError {} // 409
export class PingenGoneError extends PingenError {} // 410
export class PingenUnsupportedMediaError extends PingenError {} // 415
export class PingenUnprocessableEntityError extends PingenError {} // 422
export class PingenDependencyError extends PingenError {} // 424
export class PingenRateLimitError extends PingenError {} // 429
export class PingenServerError extends PingenError {} // 500
export class PingenServiceUnavailableError extends PingenError {} // 503
export class PingenTimeoutError extends PingenError {} // status 0 — request timed out

export class AuthenticationError extends PingenError {
  constructor(message: string) {
    super(message, 0);
  }
}

export class ValidationError extends PingenError {
  public readonly field: string;
  constructor(field: string, message: string) {
    super(message, 0);
    this.field = field;
  }
}

export class WebhookSignatureError extends PingenError {
  constructor(message: string) {
    super(message, 0);
  }
}

const HTTP_ERROR_BY_STATUS: Record<number, new (...args: ConstructorParameters<typeof PingenError>) => PingenError> = {
  400: PingenBadRequestError,
  401: PingenUnauthorizedError,
  403: PingenForbiddenError,
  404: PingenNotFoundError,
  405: PingenMethodNotAllowedError,
  406: PingenNotAcceptableError,
  409: PingenConflictError,
  410: PingenGoneError,
  415: PingenUnsupportedMediaError,
  422: PingenUnprocessableEntityError,
  424: PingenDependencyError,
  429: PingenRateLimitError,
  500: PingenServerError,
  503: PingenServiceUnavailableError,
};

export function createPingenError(
  message: string,
  status: number,
  body: unknown = null,
  requestId?: string,
  retryAfterMs?: number,
): PingenError {
  const ErrorClass = HTTP_ERROR_BY_STATUS[status] ?? PingenError;
  return new ErrorClass(message, status, body, requestId, retryAfterMs);
}

function isAbortOrTimeoutError(error: unknown): boolean {
  const matchesAbortName = (candidate: unknown): boolean =>
    candidate instanceof Error && (candidate.name === 'TimeoutError' || candidate.name === 'AbortError');
  if (matchesAbortName(error)) {
    return true;
  }
  const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
  return matchesAbortName(cause);
}

export function classifyFetchError(context: string, error: unknown): PingenError {
  if (isAbortOrTimeoutError(error)) {
    return new PingenTimeoutError(`${context} timed out.`, 0);
  }
  return new PingenError(`${context} failed unexpectedly.`, 0, error);
}

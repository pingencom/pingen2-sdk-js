export const API_PRODUCTION = 'https://api.pingen.com';
export const API_STAGING = 'https://api-staging.pingen.com';

export const USER_AGENT = 'PINGEN.SDK.NODE';
export const DEFAULT_TIMEOUT_MS = 20_000;
export const UPLOAD_TIMEOUT_MS = 60_000;
export const MAX_RETRY_ATTEMPTS = 3;
// Subtract a small safety margin from expires_in so we refresh before the token actually expires.
export const TOKEN_EXPIRY_BUFFER_SEC = 60;
// Cap server-suggested Retry-After so a misbehaving server can't stall the caller indefinitely.
export const MAX_RETRY_AFTER_MS = 10_000;
// Base for exponential backoff; attempt N waits BASE * 2^N ms (+jitter).
export const BASE_BACKOFF_MS = 250;

import { AuthenticationError, classifyFetchError, createPingenError, PingenError } from './errors';
import { API_PRODUCTION, API_STAGING, TOKEN_EXPIRY_BUFFER_SEC, DEFAULT_TIMEOUT_MS } from './constants';

interface TokenEndpointResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  useStaging?: boolean;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class OAuth {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly useStaging: boolean;
  private cachedToken: CachedToken | null = null;
  private pendingRequest: Promise<string> | null = null;

  constructor(config: OAuthConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new AuthenticationError('OAuth requires clientId and clientSecret.');
    }
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.useStaging = config.useStaging ?? false;
  }

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.accessToken;
    }
    if (this.pendingRequest) {
      return this.pendingRequest;
    }
    this.pendingRequest = this.fetchToken().finally(() => {
      this.pendingRequest = null;
    });
    return this.pendingRequest;
  }

  invalidate(): void {
    this.cachedToken = null;
  }

  private async fetchToken(): Promise<string> {
    const base = this.useStaging ? API_STAGING : API_PRODUCTION;
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
    }).toString();
    let res: Response;
    try {
      res = await fetch(`${base}/auth/access-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
    } catch (e) {
      throw classifyFetchError('Pingen auth request', e);
    }
    if (!res.ok) {
      const text = await res.text();
      throw createPingenError(`Pingen auth endpoint returned ${res.status}: ${text || res.statusText}`, res.status);
    }
    let response: TokenEndpointResponse;
    try {
      response = (await res.json()) as TokenEndpointResponse;
    } catch {
      throw new PingenError('Pingen auth endpoint returned non-JSON body.', res.status);
    }
    const ttlMs = Math.max(0, response.expires_in - TOKEN_EXPIRY_BUFFER_SEC) * 1000;
    this.cachedToken = { accessToken: response.access_token, expiresAt: Date.now() + ttlMs };
    return response.access_token;
  }
}

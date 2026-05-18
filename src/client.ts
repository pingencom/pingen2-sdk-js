import { ApiRequestor, ApiRequestorOptions } from './requestor';
import { OAuth } from './oauth';
import {
  Letters,
  Batches,
  LetterEvents,
  BatchEvents,
  EbillEvents,
  EmailEvents,
  Organisations,
  Users,
  UserAssociations,
  Webhooks,
  Ebills,
  Emails,
} from './resources';

export interface PingenClientConfig {
  clientId: string;
  clientSecret: string;
  useStaging?: boolean;
  maxAttempts?: number;
  timeoutMs?: number;
  uploadTimeoutMs?: number;
}

export class PingenClient {
  private readonly requestor: ApiRequestor;
  private readonly oauth: OAuth;

  constructor(config: PingenClientConfig);
  constructor(clientId: string, clientSecret: string, useStaging?: boolean);
  constructor(configOrClientId: PingenClientConfig | string, clientSecret?: string, useStaging?: boolean) {
    const config: PingenClientConfig =
      typeof configOrClientId === 'string'
        ? { clientId: configOrClientId, clientSecret: clientSecret as string, useStaging }
        : configOrClientId;

    this.oauth = new OAuth({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      useStaging: config.useStaging ?? false,
    });
    this.requestor = new ApiRequestor(null, this.buildRequestorOptions(config));
  }

  async ensureToken(): Promise<void> {
    this.requestor.setAccessToken(await this.oauth.getAccessToken());
  }

  letters(orgId: string): Letters {
    return new Letters(orgId, this.requestor);
  }
  batches(orgId: string): Batches {
    return new Batches(orgId, this.requestor);
  }
  letterEvents(orgId: string): LetterEvents {
    return new LetterEvents(orgId, this.requestor);
  }
  batchEvents(orgId: string): BatchEvents {
    return new BatchEvents(orgId, this.requestor);
  }
  ebillEvents(orgId: string): EbillEvents {
    return new EbillEvents(orgId, this.requestor);
  }
  emailEvents(orgId: string): EmailEvents {
    return new EmailEvents(orgId, this.requestor);
  }
  organisations(): Organisations {
    return new Organisations(this.requestor);
  }
  users(): Users {
    return new Users(this.requestor);
  }
  userAssociations(): UserAssociations {
    return new UserAssociations(this.requestor);
  }
  webhooks(orgId: string): Webhooks {
    return new Webhooks(orgId, this.requestor);
  }
  ebills(orgId: string): Ebills {
    return new Ebills(orgId, this.requestor);
  }
  emails(orgId: string): Emails {
    return new Emails(orgId, this.requestor);
  }

  private buildRequestorOptions(config: PingenClientConfig): ApiRequestorOptions {
    return {
      useStaging: config.useStaging,
      maxAttempts: config.maxAttempts,
      timeoutMs: config.timeoutMs,
      uploadTimeoutMs: config.uploadTimeoutMs,
      on401: async () => {
        this.oauth.invalidate();
        return this.oauth.getAccessToken();
      },
    };
  }
}

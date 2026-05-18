import { PingenResponse } from '../../common/response';
import { OrgResource } from '../base';
import { buildJsonApi } from '../../utils/payload';
import { WebhookCreateOptions } from './types';

export class Webhooks extends OrgResource {
  getDetails(webhookId: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/webhooks/${webhookId}`, params);
  }

  getCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/webhooks`, params);
  }

  create(opts: WebhookCreateOptions): Promise<PingenResponse> {
    return this.requestor.post(
      `/organisations/${this.orgId}/webhooks`,
      buildJsonApi({
        type: 'webhooks',
        attributes: { event_category: opts.eventCategory, url: opts.url, signing_key: opts.signingKey },
      }),
    );
  }

  delete(webhookId: string): Promise<PingenResponse> {
    return this.requestor.delete(`/organisations/${this.orgId}/webhooks/${webhookId}`);
  }
}

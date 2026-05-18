import { PingenResponse } from '../../common/response';
import { OrgResource } from '../base';

export class LetterEvents extends OrgResource {
  getCollection(letterId: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/letters/${letterId}/events`, params);
  }

  getIssueCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.eventsFeed('issues', params);
  }

  getUndeliverableCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.eventsFeed('undeliverable', params);
  }

  getDeliveredCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.eventsFeed('delivered', params);
  }

  getSentCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.eventsFeed('sent', params);
  }

  private eventsFeed(feed: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/letters/events/${feed}`, params);
  }
}

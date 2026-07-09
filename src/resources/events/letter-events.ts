import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { OrgResource } from '../base';

export class LetterEvents extends OrgResource {
  getCollection(letterId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/letters/${letterId}/events`, params);
  }

  getIssueCollection(params?: ListParams): Promise<PingenResponse> {
    return this.eventsFeed('issues', params);
  }

  getUndeliverableCollection(params?: ListParams): Promise<PingenResponse> {
    return this.eventsFeed('undeliverable', params);
  }

  getDeliveredCollection(params?: ListParams): Promise<PingenResponse> {
    return this.eventsFeed('delivered', params);
  }

  getSentCollection(params?: ListParams): Promise<PingenResponse> {
    return this.eventsFeed('sent', params);
  }

  private eventsFeed(feed: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/letters/events/${feed}`, params);
  }
}

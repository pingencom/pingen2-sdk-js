import { PingenResponse } from '../../common/response';
import { OrgResource } from '../base';

export class EmailEvents extends OrgResource {
  getCollection(emailId: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/emails/${emailId}/events`, params);
  }
}

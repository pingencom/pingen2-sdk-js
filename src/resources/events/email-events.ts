import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { OrgResource } from '../base';

export class EmailEvents extends OrgResource {
  getCollection(emailId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/emails/${emailId}/events`, params);
  }
}

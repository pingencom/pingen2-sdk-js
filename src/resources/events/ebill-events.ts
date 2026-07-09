import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { OrgResource } from '../base';

export class EbillEvents extends OrgResource {
  getCollection(ebillId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/ebills/${ebillId}/events`, params);
  }
}

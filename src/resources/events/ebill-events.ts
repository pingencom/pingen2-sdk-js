import { PingenResponse } from '../../common/response';
import { OrgResource } from '../base';

export class EbillEvents extends OrgResource {
  getCollection(ebillId: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/ebills/${ebillId}/events`, params);
  }
}

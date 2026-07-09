import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { OrgResource } from '../base';

export class BatchEvents extends OrgResource {
  getCollection(batchId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/batches/${batchId}/events`, params);
  }
}

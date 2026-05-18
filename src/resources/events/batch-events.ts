import { PingenResponse } from '../../common/response';
import { OrgResource } from '../base';

export class BatchEvents extends OrgResource {
  getCollection(batchId: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/batches/${batchId}/events`, params);
  }
}

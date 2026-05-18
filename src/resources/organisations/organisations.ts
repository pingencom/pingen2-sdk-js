import { PingenResponse } from '../../common/response';
import { BaseResource } from '../base';

export class Organisations extends BaseResource {
  getDetails(orgId: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${orgId}`, params);
  }

  getCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get('/organisations', params);
  }
}

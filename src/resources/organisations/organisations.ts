import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { BaseResource } from '../base';

export class Organisations extends BaseResource {
  getDetails(orgId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${orgId}`, params);
  }

  getCollection(params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get('/organisations', params);
  }
}

import { PingenResponse } from '../../common/response';
import { BaseResource } from '../base';

export class UserAssociations extends BaseResource {
  getCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get('/user/associations', params);
  }
}

import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { BaseResource } from '../base';

export class UserAssociations extends BaseResource {
  getCollection(params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get('/user/associations', params);
  }
}

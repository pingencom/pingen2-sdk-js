import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { BaseResource } from '../base';

export class Users extends BaseResource {
  getDetails(params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get('/user', params);
  }
}

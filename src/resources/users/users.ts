import { PingenResponse } from '../../common/response';
import { BaseResource } from '../base';

export class Users extends BaseResource {
  getDetails(params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get('/user', params);
  }
}

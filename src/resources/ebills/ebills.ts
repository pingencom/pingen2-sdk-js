import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { OrgResource } from '../base';
import { buildJsonApi } from '../../utils/payload';
import { definedOnly } from '../../utils/object';
import { EbillCreateOptions, EbillUploadOptions } from './types';

export class Ebills extends OrgResource {
  getDetails(ebillId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/ebills/${ebillId}`, params);
  }

  getCollection(params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/ebills`, params);
  }

  uploadAndCreate(opts: EbillUploadOptions): Promise<PingenResponse> {
    return this.uploadAndCall(opts, (rest) => this.create(rest));
  }

  create(opts: EbillCreateOptions): Promise<PingenResponse> {
    const attributes = definedOnly({
      file_original_name: opts.fileOriginalName,
      file_url: opts.fileUrl,
      file_url_signature: opts.fileSignature,
      auto_send: opts.autoSend,
      meta_data: opts.metaData,
    });
    return this.requestor.post(
      `/organisations/${this.orgId}/deliveries/ebills`,
      buildJsonApi({ type: 'ebills', attributes, relationships: opts.preset?.toValue() }),
    );
  }

  cancel(ebillId: string): Promise<PingenResponse> {
    return this.requestor.patch(`/organisations/${this.orgId}/deliveries/ebills/${ebillId}/cancel`);
  }

  delete(ebillId: string): Promise<PingenResponse> {
    return this.requestor.delete(`/organisations/${this.orgId}/deliveries/ebills/${ebillId}`);
  }

  getFile(ebillId: string): Promise<string> {
    return this.requestor.stream(`/organisations/${this.orgId}/deliveries/ebills/${ebillId}/file`);
  }
}

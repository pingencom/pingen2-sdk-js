import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { OrgResource } from '../base';
import { buildJsonApi } from '../../utils/payload';
import { definedOnly } from '../../utils/object';
import { EmailCreateOptions, EmailUploadOptions } from './types';

export class Emails extends OrgResource {
  getDetails(emailId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/emails/${emailId}`, params);
  }

  getCollection(params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/emails`, params);
  }

  uploadAndCreate(opts: EmailUploadOptions): Promise<PingenResponse> {
    return this.uploadAndCall(opts, (rest) => this.create(rest));
  }

  create(opts: EmailCreateOptions): Promise<PingenResponse> {
    const attributes = definedOnly({
      file_original_name: opts.fileOriginalName,
      file_url: opts.fileUrl,
      file_url_signature: opts.fileSignature,
      auto_send: opts.autoSend,
      meta_data: opts.metaData,
    });
    return this.requestor.post(
      `/organisations/${this.orgId}/deliveries/emails`,
      buildJsonApi({ type: 'emails', attributes, relationships: opts.preset?.toValue() }),
    );
  }

  cancel(emailId: string): Promise<PingenResponse> {
    return this.requestor.patch(`/organisations/${this.orgId}/deliveries/emails/${emailId}/cancel`);
  }

  delete(emailId: string): Promise<PingenResponse> {
    return this.requestor.delete(`/organisations/${this.orgId}/deliveries/emails/${emailId}`);
  }

  getFile(emailId: string): Promise<string> {
    return this.requestor.stream(`/organisations/${this.orgId}/deliveries/emails/${emailId}/file`);
  }
}

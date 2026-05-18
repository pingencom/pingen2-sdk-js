import { PingenResponse } from '../../common/response';
import { ValidationError } from '../../errors';
import { OrgResource } from '../base';
import { buildJsonApi } from '../../utils/payload';
import { definedOnly } from '../../utils/object';
import { BatchCreateOptions, BatchUploadOptions, BatchSendOptions, BatchEditOptions } from './types';

const BATCH_NAME_MIN = 5;
const BATCH_NAME_MAX = 100;

export class Batches extends OrgResource {
  getDetails(batchId: string, params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/batches/${batchId}`, params);
  }

  getCollection(params?: Record<string, string>): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/batches`, params);
  }

  uploadAndCreate(opts: BatchUploadOptions): Promise<PingenResponse> {
    return this.uploadAndCall(opts, (rest) => this.create(rest));
  }

  create(opts: BatchCreateOptions): Promise<PingenResponse> {
    const attributes = definedOnly({
      file_url: opts.fileUrl,
      file_url_signature: opts.fileSignature,
      name: opts.name,
      icon: opts.icon,
      file_original_name: opts.fileOriginalName,
      address_position: opts.addressPosition,
      grouping_type: opts.groupingType,
      grouping_options_split_type: opts.splitType,
      grouping_options_split_size: opts.splitSize,
      grouping_options_split_separator: opts.splitSeparator,
      grouping_options_split_position: opts.splitPosition,
    });
    return this.requestor.post(
      `/organisations/${this.orgId}/batches`,
      buildJsonApi({ type: 'batches', attributes, relationships: opts.preset?.toValue() }),
    );
  }

  send(opts: BatchSendOptions): Promise<PingenResponse> {
    return this.requestor.patch(
      `/organisations/${this.orgId}/batches/${opts.batchId}/send`,
      buildJsonApi({
        type: 'batches',
        id: opts.batchId,
        attributes: {
          delivery_products: opts.deliveryProducts,
          print_mode: opts.printMode,
          print_spectrum: opts.printSpectrum,
        },
      }),
    );
  }

  cancel(batchId: string): Promise<PingenResponse> {
    return this.requestor.patch(`/organisations/${this.orgId}/batches/${batchId}/cancel`);
  }

  delete(batchId: string): Promise<PingenResponse> {
    return this.requestor.delete(`/organisations/${this.orgId}/batches/${batchId}`);
  }

  edit(batchId: string, opts: BatchEditOptions): Promise<PingenResponse> {
    if (opts.name !== undefined && (opts.name.length < BATCH_NAME_MIN || opts.name.length > BATCH_NAME_MAX)) {
      throw new ValidationError('name', `name must be between ${BATCH_NAME_MIN} and ${BATCH_NAME_MAX} characters`);
    }
    return this.requestor.patch(
      `/organisations/${this.orgId}/batches/${batchId}`,
      buildJsonApi({
        type: 'batches',
        id: batchId,
        attributes: definedOnly({ name: opts.name, icon: opts.icon }),
      }),
    );
  }

  getStatistics(batchId: string): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/batches/${batchId}/statistics`);
  }
}

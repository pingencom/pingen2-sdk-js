import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { ValidationError } from '../../errors';
import { OrgResource } from '../base';
import { buildJsonApi } from '../../utils/payload';
import { definedOnly } from '../../utils/object';
import { ChannelType } from '../../common/enums';
import { BatchElectronicDeliveryProduct, BatchSendType } from './enums';
import {
  BatchCreateOptions,
  BatchUploadOptions,
  BatchSendOptions,
  BatchEditOptions,
  BatchDeleteOptions,
} from './types';

const BATCH_NAME_MIN = 5;
const BATCH_NAME_MAX = 100;

// The `send` payload depends on the batch's channel: the physical (`post`) channel carries the
// print settings, while the electronic channels take a single fixed delivery product.
function sendPayload(opts: BatchSendOptions): { type: BatchSendType; attributes: Record<string, unknown> } {
  switch (opts.channelType) {
    case ChannelType.Email:
      return {
        type: BatchSendType.Email,
        attributes: { delivery_product: BatchElectronicDeliveryProduct.Email },
      };
    case ChannelType.Ebill:
      return {
        type: BatchSendType.Ebill,
        attributes: { delivery_product: BatchElectronicDeliveryProduct.Ebill },
      };
    default:
      return {
        type: BatchSendType.Post,
        attributes: {
          delivery_product: opts.deliveryProduct,
          print_mode: opts.printMode,
          print_spectrum: opts.printSpectrum,
        },
      };
  }
}

export class Batches extends OrgResource {
  getDetails(batchId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/batches/${batchId}`, params);
  }

  getCollection(params?: ListParams): Promise<PingenResponse> {
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
      channel_type: opts.channelType ?? ChannelType.Post,
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
    const { type, attributes } = sendPayload(opts);
    return this.requestor.patch(
      `/organisations/${this.orgId}/batches/${opts.batchId}/send`,
      buildJsonApi({ type, id: opts.batchId, attributes }),
    );
  }

  cancel(batchId: string): Promise<PingenResponse> {
    return this.requestor.patch(`/organisations/${this.orgId}/batches/${batchId}/cancel`);
  }

  // The API requires a body here: `with_letters` is deprecated but still mandatory, so it is
  // derived from `withDeliverables` — the flag callers actually reason about.
  delete(batchId: string, opts: BatchDeleteOptions = {}): Promise<PingenResponse> {
    const withDeliverables = opts.withDeliverables ?? false;
    return this.requestor.delete(
      `/organisations/${this.orgId}/batches/${batchId}`,
      buildJsonApi({
        type: 'batches',
        id: batchId,
        attributes: { with_deliverables: withDeliverables, with_letters: withDeliverables },
      }),
    );
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

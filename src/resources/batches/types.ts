import { AddressPosition, ChannelType, DeliveryProduct, PrintMode, PrintSpectrum } from '../../common/enums';
import { PresetRelationship } from '../../common/preset';
import { BatchIcon, GroupingType, SplitType, SplitPosition } from './enums';

export interface BatchCreateOptions {
  fileUrl: string;
  fileSignature: string;
  name: string;
  icon: BatchIcon;
  fileOriginalName: string;
  addressPosition: AddressPosition;
  groupingType: GroupingType;
  splitType: SplitType;
  channelType?: ChannelType;
  splitSize?: number;
  splitSeparator?: string;
  splitPosition?: SplitPosition;
  preset?: PresetRelationship;
}

export interface BatchUploadOptions {
  filePath: string;
  name: string;
  icon: BatchIcon;
  fileOriginalName: string;
  addressPosition: AddressPosition;
  groupingType: GroupingType;
  splitType: SplitType;
  /** See {@link BatchCreateOptions.channelType} — defaults to {@link ChannelType.Post}. */
  channelType?: ChannelType;
  splitSize?: number;
  splitSeparator?: string;
  splitPosition?: SplitPosition;
  preset?: PresetRelationship;
}

export interface BatchPostSendOptions {
  batchId: string;
  channelType?: ChannelType.Post;
  deliveryProduct: DeliveryProduct;
  printMode: PrintMode;
  printSpectrum: PrintSpectrum;
}

/** Send an `email` batch — the API accepts only `electronic_email`, which the SDK fills in. */
export interface BatchEmailSendOptions {
  batchId: string;
  channelType: ChannelType.Email;
}

/** Send an `ebill` batch — the API accepts only `electronic_ebill`, which the SDK fills in. */
export interface BatchEbillSendOptions {
  batchId: string;
  channelType: ChannelType.Ebill;
}

export type BatchSendOptions = BatchPostSendOptions | BatchEmailSendOptions | BatchEbillSendOptions;

// Per Pingen API spec (batches.edit), only `name` and `icon` are editable on a batch.
// Both are optional — PATCH semantics — but at least one should be provided.
export interface BatchEditOptions {
  name?: string;
  icon?: BatchIcon;
}

export interface BatchDeleteOptions {
  /**
   * Also delete the deliverables (letters / e-bills / emails) contained in the batch.
   * Defaults to `false`. The API still requires the deprecated `with_letters` flag, which the
   * SDK derives from this value.
   */
  withDeliverables?: boolean;
}

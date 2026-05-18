import { AddressPosition, PrintMode, PrintSpectrum } from '../../common/enums';
import { PresetRelationship } from '../../common/preset';
import { BatchIcon, GroupingType, SplitType, SplitPosition, BatchDeliveryProduct } from './enums';

export interface BatchCreateOptions {
  fileUrl: string;
  fileSignature: string;
  name: string;
  icon: BatchIcon;
  fileOriginalName: string;
  addressPosition: AddressPosition;
  groupingType: GroupingType;
  splitType: SplitType;
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
  splitSize?: number;
  splitSeparator?: string;
  splitPosition?: SplitPosition;
  preset?: PresetRelationship;
}

export interface BatchSendOptions {
  batchId: string;
  deliveryProducts: BatchDeliveryProduct[];
  printMode: PrintMode;
  printSpectrum: PrintSpectrum;
}

// Per Pingen API spec (batches.edit), only `name` and `icon` are editable on a batch.
// Both are optional — PATCH semantics — but at least one should be provided.
export interface BatchEditOptions {
  name?: string;
  icon?: BatchIcon;
}

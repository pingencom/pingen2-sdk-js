import { PresetRelationship } from '../../common/preset';

export interface EbillMetaData {
  invoice_number: string;
  invoice_date: string;
  invoice_due_date: string;
  recipient_identifier: string;
}

export interface EbillCreateOptions {
  fileUrl: string;
  fileSignature: string;
  fileOriginalName: string;
  autoSend: boolean;
  metaData?: EbillMetaData;
  preset?: PresetRelationship;
}

export interface EbillUploadOptions {
  filePath: string;
  fileOriginalName: string;
  autoSend: boolean;
  metaData?: EbillMetaData;
  preset?: PresetRelationship;
}

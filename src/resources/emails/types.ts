import { PresetRelationship } from '../../common/preset';

export interface EmailMetaData {
  sender_name: string;
  recipient_email: string;
  recipient_name: string;
  reply_email: string;
  reply_name: string;
  subject: string;
  content: string;
}

export interface EmailCreateOptions {
  fileUrl: string;
  fileSignature: string;
  fileOriginalName: string;
  autoSend: boolean;
  metaData?: EmailMetaData;
  preset?: PresetRelationship;
}

export interface EmailUploadOptions {
  filePath: string;
  fileOriginalName: string;
  autoSend: boolean;
  metaData?: EmailMetaData;
  preset?: PresetRelationship;
}

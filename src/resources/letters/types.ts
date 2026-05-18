import { AddressPosition, DeliveryProduct, PrintMode, PrintSpectrum, PaperType } from '../../common/enums';
import { PresetRelationship } from '../../common/preset';

export interface LetterRecipient {
  name: string;
  street?: string;
  pobox?: string;
  number?: string;
  zip: string;
  city: string;
  country: string;
}

export interface LetterSender {
  name: string;
  street?: string;
  pobox?: string;
  number?: string;
  zip: string;
  city: string;
  country: string;
}

export interface LetterMetaData {
  recipient: LetterRecipient;
  sender: LetterSender;
}

export interface LetterCreateOptions {
  fileUrl: string;
  fileSignature: string;
  fileOriginalName: string;
  addressPosition: AddressPosition;
  autoSend: boolean;
  deliveryProduct?: DeliveryProduct;
  printMode?: PrintMode;
  printSpectrum?: PrintSpectrum;
  metaData?: LetterMetaData;
  preset?: PresetRelationship;
}

export interface LetterUploadOptions {
  filePath: string;
  fileOriginalName: string;
  addressPosition: AddressPosition;
  autoSend: boolean;
  deliveryProduct?: DeliveryProduct;
  printMode?: PrintMode;
  printSpectrum?: PrintSpectrum;
  metaData?: LetterMetaData;
  preset?: PresetRelationship;
}

export interface LetterSendOptions {
  letterId: string;
  deliveryProduct: DeliveryProduct;
  printMode: PrintMode;
  printSpectrum: PrintSpectrum;
}

export interface LetterPriceOptions {
  country: string;
  paperTypes: PaperType[];
  printMode: PrintMode;
  printSpectrum: PrintSpectrum;
  deliveryProduct: DeliveryProduct;
}

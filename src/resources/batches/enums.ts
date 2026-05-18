import { DeliveryProduct } from '../../common/enums';

export enum BatchIcon {
  Campaign = 'campaign',
  Megaphone = 'megaphone',
  WaveHand = 'wave-hand',
  Flash = 'flash',
  Rocket = 'rocket',
  Bell = 'bell',
  PercentTag = 'percent-tag',
  PercentBadge = 'percent-badge',
  Present = 'present',
  Receipt = 'receipt',
  Document = 'document',
  Information = 'information',
  Calendar = 'calendar',
  Newspaper = 'newspaper',
  Crown = 'crown',
  Virus = 'virus',
}

export enum GroupingType {
  Merge = 'merge',
  Zip = 'zip',
}

export enum SplitType {
  File = 'file',
  Page = 'page',
  Custom = 'custom',
  QrInvoice = 'qr_invoice',
}

export enum SplitPosition {
  FirstPage = 'first_page',
  LastPage = 'last_page',
}

export interface BatchDeliveryProduct {
  country: string;
  delivery_product: string;
}

export function createBatchDeliveryProduct(country: string, deliveryProduct: DeliveryProduct): BatchDeliveryProduct {
  return { country, delivery_product: deliveryProduct };
}

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

// `send` takes a different JSON:API `type` per channel — the API validates the payload against
// the batch's channel_type, so the SDK picks the matching one.
export enum BatchSendType {
  Post = 'batches_channel_post_send',
  Email = 'batches_channel_email_send',
  Ebill = 'batches_channel_ebill_send',
}

// Electronic channels have exactly one delivery product each, so callers never pass it — the
// SDK fills in the constant the API expects.
export enum BatchElectronicDeliveryProduct {
  Email = 'electronic_email',
  Ebill = 'electronic_ebill',
}

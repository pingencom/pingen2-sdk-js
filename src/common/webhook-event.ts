import { RelationshipItem } from './relationships';

export interface WebhookEventAttributes {
  reason?: string;
  corrected_address?: CorrectedAddress;
  url?: string;
  created_at?: string;
}

export interface WebhookEventRelationships {
  organisation?: RelationshipItem;
  letter?: RelationshipItem;
  event?: RelationshipItem;
}

export interface CorrectedAddress {
  name?: string;
  street?: string;
  number?: string;
  zip?: string;
  city?: string;
}

export interface WebhookChannelSubscriptionAttributes {
  identifier?: string;
  email?: string;
  name?: string;
  address?: string;
  status?: string;
  approved_at?: string;
  url?: string;
  created_at?: string;
}

export interface WebhookChannelSubscriptionRelationships {
  organisation?: RelationshipItem;
  channel_ebill?: RelationshipItem;
}

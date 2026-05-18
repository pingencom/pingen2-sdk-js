import { WebhookEventCategory } from './enums';

export interface WebhookCreateOptions {
  eventCategory: WebhookEventCategory;
  url: string;
  signingKey: string;
}

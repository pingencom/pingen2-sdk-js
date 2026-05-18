import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookSignatureError } from './errors';

export interface WebhookEvent {
  body: string;
  data: unknown;
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): void {
  if (!signature) {
    throw new WebhookSignatureError('Signature missing.');
  }
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (expected.length !== signature.length || !/^[0-9a-f]+$/.test(signature)) {
    throw new WebhookSignatureError('Webhook signature matching failed.');
  }
  const expectedBytes = Buffer.from(expected, 'utf8');
  const providedBytes = Buffer.from(signature, 'utf8');
  if (!timingSafeEqual(expectedBytes, providedBytes)) {
    throw new WebhookSignatureError('Webhook signature matching failed.');
  }
}

export function constructWebhookEvent(payload: string, signature: string, secret: string): WebhookEvent {
  verifyWebhookSignature(payload, signature, secret);
  return { body: payload, data: JSON.parse(payload) };
}

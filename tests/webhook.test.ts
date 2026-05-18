import { createHmac } from 'crypto';
import { constructWebhookEvent, verifyWebhookSignature } from '../src/webhook';
import { WebhookSignatureError } from '../src/errors';

describe('constructWebhookEvent', () => {
  const PAYLOAD = '{"data":{"type":"webhook_issues","id":"309a31e0-1abe-4034-8e7e-1fd473a802fd"}}';
  const SECRET = 'webhook_test_secret123';
  const SIG = createHmac('sha256', SECRET).update(PAYLOAD).digest('hex');

  test('accepts a correctly signed payload', () => {
    const event = constructWebhookEvent(PAYLOAD, SIG, SECRET);
    expect((event.data as { data: { type: string } }).data.type).toBe('webhook_issues');
  });

  test('rejects missing signature', () => {
    expect(() => constructWebhookEvent(PAYLOAD, '', SECRET)).toThrow(/Signature missing/);
  });

  test('rejects same-length but wrong-bytes signature (timing-safe path)', () => {
    const flipped = SIG.slice(0, -1) + (SIG.slice(-1) === '0' ? '1' : '0');
    expect(() => constructWebhookEvent(PAYLOAD, flipped, SECRET)).toThrow(/matching failed/);
  });

  test('rejects wrong-length signature without reaching timingSafeEqual', () => {
    expect(() => constructWebhookEvent(PAYLOAD, 'too-short', SECRET)).toThrow(/matching failed/);
  });

  test('rejects same-length signature that is not valid hex', () => {
    const fake = 'z'.repeat(SIG.length);
    expect(() => constructWebhookEvent(PAYLOAD, fake, SECRET)).toThrow(/matching failed/);
  });

  test('rejects uppercase-hex signature (Pingen always emits lowercase)', () => {
    expect(() => constructWebhookEvent(PAYLOAD, SIG.toUpperCase(), SECRET)).toThrow(/matching failed/);
  });

  test('rejects signature signed with a different secret', () => {
    const wrong = createHmac('sha256', 'other-secret').update(PAYLOAD).digest('hex');
    expect(() => constructWebhookEvent(PAYLOAD, wrong, SECRET)).toThrow(/matching failed/);
  });

  test('throws WebhookSignatureError (not generic Error)', () => {
    expect(() => verifyWebhookSignature(PAYLOAD, '', SECRET)).toThrow(WebhookSignatureError);
  });
});

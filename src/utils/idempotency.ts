import { randomUUID } from 'crypto';

export function newIdempotencyKey(): string {
  return randomUUID();
}

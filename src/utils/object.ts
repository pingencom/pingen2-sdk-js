// Drop keys whose value is `undefined`. Used for building API attribute payloads from
// option objects without a wall of `if (opts.x != null) attrs.x_snake = opts.x;` lines.
// We deliberately keep `null` and falsy values (0, '', false) — only `undefined` means
// "the caller didn't provide this".
export function definedOnly<T extends Record<string, unknown>>(input: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(input) as (keyof T)[]) {
    if (input[key] !== undefined) {
      result[key] = input[key];
    }
  }
  return result;
}

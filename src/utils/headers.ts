// Flatten the Headers WHATWG iterable into a plain Record. Headers normalises keys to
// lower-case and joins multi-value entries (e.g., set-cookie) with a comma.
export function headersToRecord(headers: Headers): Record<string, string> {
  const rec: Record<string, string> = {};
  headers.forEach((v, k) => {
    rec[k] = v;
  });
  return rec;
}

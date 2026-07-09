/**
 * Typed query parameters accepted by collection (`getCollection`) and detail
 * (`getDetails`) endpoints. These map onto the JSON:API conventions used by the
 * Pingen REST API, so the editor and linter can guide you instead of forcing a
 * trip to the docs.
 */
export interface ListParams {
  /** Pagination: `page[number]` (1-based) and `page[limit]` (items per page). */
  page?: {
    number?: number;
    limit?: number;
  };
  /** Sort expression, e.g. `'created_at'` or `'-created_at'` for descending. */
  sort?: string;
  /** Full-text search query (`q`). */
  q?: string;
  /** Comma-separated list of relationships to side-load, e.g. `'events'`. */
  include?: string;
  /**
   * Sparse fieldsets: restrict the attributes returned per resource type,
   * e.g. `{ organisations: 'name,status' }` → `fields[organisations]=name,status`.
   */
  fields?: Record<string, string>;
}

/**
 * Flattens {@link ListParams} into the raw `Record<string, string>` query
 * string that the API expects. Returns `undefined` when there is nothing to
 * serialize so callers can skip building a query string entirely.
 */
export function serializeListParams(params?: ListParams): Record<string, string> | undefined {
  if (!params) {
    return undefined;
  }
  const out: Record<string, string> = {};
  if (params.page?.number !== undefined) {
    out['page[number]'] = String(params.page.number);
  }
  if (params.page?.limit !== undefined) {
    out['page[limit]'] = String(params.page.limit);
  }
  if (params.sort !== undefined) {
    out['sort'] = params.sort;
  }
  if (params.q !== undefined) {
    out['q'] = params.q;
  }
  if (params.include !== undefined) {
    out['include'] = params.include;
  }
  if (params.fields) {
    for (const [type, value] of Object.entries(params.fields)) {
      out[`fields[${type}]`] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

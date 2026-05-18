import { PingenError } from '../errors';
import { ApiResource, ApiCollection, ApiCollectionItem } from './typed-response';
import { JsonApiResource, JsonApiCollection } from './json-api';

export class PingenResponse {
  public readonly body: string;
  public readonly statusCode: number;
  public readonly headers: Record<string, string>;
  public readonly data: unknown;

  constructor(body: string, statusCode: number, headers: Record<string, string>) {
    this.body = body;
    this.statusCode = statusCode;
    this.headers = headers;
    this.data = body ? safeParse(body) : null;
  }

  get requestId(): string | null {
    return this.headers['x-request-id'] ?? null;
  }

  toResource<A>(): ApiResource<A> {
    const raw = this.data;
    if (!isJsonApiResource(raw)) {
      throw new PingenError('Response body is not a JSON:API resource document.', this.statusCode, raw);
    }
    return {
      id: raw.data.id,
      resourceType: raw.data.type,
      attributes: raw.data.attributes as unknown as A,
      relationships: raw.data.relationships,
      links: raw.data.links,
      meta: raw.data.meta,
      included: raw.included ?? [],
      statusCode: this.statusCode,
      headers: this.headers,
    };
  }

  toCollection<A>(): ApiCollection<A> {
    const raw = this.data;
    if (!isJsonApiCollection(raw)) {
      throw new PingenError('Response body is not a JSON:API collection document.', this.statusCode, raw);
    }
    const items: ApiCollectionItem<A>[] = raw.data.map((obj) => ({
      id: obj.id,
      resourceType: obj.type,
      attributes: obj.attributes as unknown as A,
      relationships: obj.relationships,
      links: obj.links,
      meta: obj.meta,
    }));
    return {
      data: items,
      links: raw.links,
      meta: raw.meta,
      included: raw.included ?? [],
      statusCode: this.statusCode,
      headers: this.headers,
    };
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isJsonApiResource(v: unknown): v is JsonApiResource {
  if (!isObject(v)) {
    return false;
  }
  const data = v.data;
  return isObject(data) && typeof (data as { type?: unknown }).type === 'string';
}

function isJsonApiCollection(v: unknown): v is JsonApiCollection {
  return isObject(v) && Array.isArray(v.data);
}

function safeParse(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

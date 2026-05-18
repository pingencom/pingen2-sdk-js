export interface ResourceObject {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  links?: ItemLinks;
  meta?: Record<string, unknown>;
}

export interface JsonApiResource {
  data: ResourceObject;
  included?: Record<string, unknown>[];
}

export interface JsonApiCollection {
  data: ResourceObject[];
  links?: CollectionLinks;
  meta?: CollectionMeta;
  included?: Record<string, unknown>[];
}

export interface CollectionLinks {
  first?: string;
  last?: string;
  prev?: string | null;
  next?: string | null;
  self?: string;
}

export interface CollectionMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  from?: number;
  to?: number;
  total?: number;
}

export interface ItemLinks {
  self?: string;
}
